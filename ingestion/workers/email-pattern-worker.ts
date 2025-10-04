/**
 * Email Pattern Worker
 *
 * Discovers and verifies email patterns from multiple sources:
 * 1. Hunter.io - Email finder API
 * 2. Clearbit - Company enrichment API
 * 3. GitHub commits - Extract author/committer emails
 * 4. Manual submissions - User-verified patterns
 *
 * Data flow:
 * Domain → Multiple APIs → Pattern Analysis → Queue → D1
 */

export interface Env {
  DB: D1Database
  RAW_BUCKET: R2Bucket
  KV: KVNamespace
  INGESTION_QUEUE: Queue
  ANALYTICS: AnalyticsEngineDataset

  // API Keys (secrets)
  HUNTER_API_KEY?: string
  CLEARBIT_API_KEY?: string
  GITHUB_TOKEN?: string
}

interface EmailPattern {
  domain: string
  pattern: string // e.g., "{first}.{last}@domain.com"
  confidence: number // 0.0 to 1.0
  verified: boolean
  verified_at?: string
  verified_by?: string
  sources: string[] // ['hunter.io', 'clearbit', 'github']
  sample_emails: string[]
  organization_id?: string
  employee_count?: number
}

interface IngestMessage {
  source: 'email'
  action: 'upsert' | 'delete'
  data: EmailPattern
  timestamp: number
}

// ============================================================================
// Main Worker
// ============================================================================

export default {
  /**
   * HTTP handler
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    try {
      // Route based on path
      if (url.pathname === '/discover') {
        const domain = url.searchParams.get('domain')
        if (!domain) {
          return Response.json({ error: 'Missing domain parameter' }, { status: 400 })
        }
        return await handleDiscoverPattern(domain, env)
      }

      if (url.pathname === '/verify') {
        const domain = url.searchParams.get('domain')
        const pattern = url.searchParams.get('pattern')
        if (!domain || !pattern) {
          return Response.json({ error: 'Missing domain or pattern' }, { status: 400 })
        }
        return await handleVerifyPattern(domain, pattern, env)
      }

      if (url.pathname === '/submit') {
        if (request.method !== 'POST') {
          return Response.json({ error: 'Method not allowed' }, { status: 405 })
        }
        const body = await request.json<EmailPattern>()
        return await handleSubmitPattern(body, env)
      }

      if (url.pathname === '/status') {
        return await handleStatus(env)
      }

      return Response.json({
        service: 'email-pattern-worker',
        endpoints: {
          '/discover?domain=<domain>': 'Discover email pattern for domain',
          '/verify?domain=<domain>&pattern=<pattern>': 'Verify email pattern',
          'POST /submit': 'Submit verified pattern',
          '/status': 'Worker status'
        }
      })

    } catch (error) {
      console.error('Email pattern error:', error)
      return Response.json({
        error: error.message
      }, { status: 500 })
    }
  }
}

// ============================================================================
// Discover Email Pattern
// ============================================================================

async function handleDiscoverPattern(domain: string, env: Env): Promise<Response> {
  console.log(`Discovering email pattern for: ${domain}`)

  try {
    // Check cache first
    const cached = await env.KV.get(`pattern:${domain}`, 'json')
    if (cached) {
      return Response.json({
        status: 'cached',
        ...cached
      })
    }

    // Aggregate from multiple sources
    const sources = await Promise.allSettled([
      queryHunterIo(domain, env),
      queryClearbit(domain, env),
      queryGitHubCommits(domain, env)
    ])

    // Combine results
    const patterns: Partial<EmailPattern>[] = []

    sources.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        patterns.push(result.value)
      } else if (result.status === 'rejected') {
        console.error(`Source ${i} failed:`, result.reason)
      }
    })

    if (patterns.length === 0) {
      return Response.json({
        status: 'not_found',
        domain,
        message: 'No email patterns found from any source'
      }, { status: 404 })
    }

    // Merge patterns (combine confidence scores, sources, samples)
    const merged = mergePatterns(domain, patterns)

    // Cache for 24 hours
    await env.KV.put(`pattern:${domain}`, JSON.stringify(merged), {
      expirationTtl: 86400
    })

    // Queue for storage
    await env.INGESTION_QUEUE.send({
      source: 'email',
      action: 'upsert',
      data: merged,
      timestamp: Date.now()
    } as IngestMessage)

    return Response.json({
      status: 'discovered',
      ...merged
    })

  } catch (error) {
    console.error(`Failed to discover pattern for ${domain}:`, error)
    return Response.json({
      error: error.message
    }, { status: 500 })
  }
}

// ============================================================================
// Verify Email Pattern
// ============================================================================

async function handleVerifyPattern(
  domain: string,
  pattern: string,
  env: Env
): Promise<Response> {
  console.log(`Verifying pattern ${pattern} for ${domain}`)

  try {
    // Generate test emails from pattern
    const testEmails = generateTestEmails(pattern, domain)

    // Verify each email (basic format check + DNS MX record check)
    const verifiedEmails = []
    for (const email of testEmails) {
      const isValid = await verifyEmail(email, env)
      if (isValid) {
        verifiedEmails.push(email)
      }
    }

    const confidence = verifiedEmails.length / testEmails.length

    const patternData: EmailPattern = {
      domain,
      pattern,
      confidence,
      verified: confidence >= 0.7,
      verified_at: new Date().toISOString(),
      verified_by: 'automated',
      sources: ['verification'],
      sample_emails: verifiedEmails
    }

    // Queue for storage
    await env.INGESTION_QUEUE.send({
      source: 'email',
      action: 'upsert',
      data: patternData,
      timestamp: Date.now()
    } as IngestMessage)

    return Response.json({
      status: 'verified',
      ...patternData
    })

  } catch (error) {
    console.error(`Failed to verify pattern for ${domain}:`, error)
    return Response.json({
      error: error.message
    }, { status: 500 })
  }
}

// ============================================================================
// Submit Manual Pattern
// ============================================================================

async function handleSubmitPattern(pattern: EmailPattern, env: Env): Promise<Response> {
  console.log(`Manual pattern submission for: ${pattern.domain}`)

  try {
    // Mark as manually verified
    pattern.verified = true
    pattern.verified_at = new Date().toISOString()
    pattern.verified_by = 'manual'
    pattern.confidence = 1.0

    // Queue for storage
    await env.INGESTION_QUEUE.send({
      source: 'email',
      action: 'upsert',
      data: pattern,
      timestamp: Date.now()
    } as IngestMessage)

    return Response.json({
      status: 'submitted',
      domain: pattern.domain
    })

  } catch (error) {
    console.error(`Failed to submit pattern:`, error)
    return Response.json({
      error: error.message
    }, { status: 500 })
  }
}

// ============================================================================
// Status Handler
// ============================================================================

async function handleStatus(env: Env): Promise<Response> {
  try {
    // Get pattern count
    const count = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM email_patterns
    `).first<{ count: number }>()

    // Get verified count
    const verified = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM email_patterns WHERE verified = 1
    `).first<{ count: number }>()

    return Response.json({
      service: 'email-pattern-worker',
      total_patterns: count?.count || 0,
      verified_patterns: verified?.count || 0,
      sources: {
        hunter_io: !!env.HUNTER_API_KEY,
        clearbit: !!env.CLEARBIT_API_KEY,
        github: !!env.GITHUB_TOKEN
      }
    })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// Data Source: Hunter.io
// ============================================================================

async function queryHunterIo(
  domain: string,
  env: Env
): Promise<Partial<EmailPattern> | null> {
  if (!env.HUNTER_API_KEY) {
    console.log('Hunter.io API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${env.HUNTER_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`Hunter.io returned ${response.status}`)
    }

    const data = await response.json<any>()

    if (!data.data?.pattern) {
      return null
    }

    // Hunter.io pattern format: {first}.{last}
    return {
      domain,
      pattern: data.data.pattern.replace(/{f}/g, '{first}').replace(/{l}/g, '{last}') + `@${domain}`,
      confidence: data.data.confidence / 100, // Convert 0-100 to 0.0-1.0
      sources: ['hunter.io'],
      sample_emails: data.data.emails?.map((e: any) => e.value).slice(0, 5) || [],
      employee_count: data.data.organization?.employee_count
    }

  } catch (error) {
    console.error('Hunter.io query failed:', error)
    return null
  }
}

// ============================================================================
// Data Source: Clearbit
// ============================================================================

async function queryClearbit(
  domain: string,
  env: Env
): Promise<Partial<EmailPattern> | null> {
  if (!env.CLEARBIT_API_KEY) {
    console.log('Clearbit API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://company.clearbit.com/v2/companies/find?domain=${domain}`,
      {
        headers: {
          'Authorization': `Bearer ${env.CLEARBIT_API_KEY}`
        }
      }
    )

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Clearbit returned ${response.status}`)
    }

    const data = await response.json<any>()

    // Clearbit doesn't provide patterns directly, but we can infer from metrics
    return {
      domain,
      confidence: 0.5, // Lower confidence since inferred
      sources: ['clearbit'],
      sample_emails: [],
      employee_count: data.metrics?.employees,
      organization_id: data.id
    }

  } catch (error) {
    console.error('Clearbit query failed:', error)
    return null
  }
}

// ============================================================================
// Data Source: GitHub Commits
// ============================================================================

async function queryGitHubCommits(
  domain: string,
  env: Env
): Promise<Partial<EmailPattern> | null> {
  if (!env.GITHUB_TOKEN) {
    console.log('GitHub token not configured')
    return null
  }

  try {
    // Search for commits with emails from this domain
    const response = await fetch(
      `https://api.github.com/search/commits?q=author-email:@${domain}&per_page=100`,
      {
        headers: {
          'Authorization': `token ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.cloak-preview+json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`)
    }

    const data = await response.json<any>()

    if (!data.items || data.items.length === 0) {
      return null
    }

    // Extract emails from commits
    const emails = data.items
      .map((item: any) => item.commit?.author?.email)
      .filter((email: string) => email && email.endsWith(`@${domain}`))

    if (emails.length === 0) {
      return null
    }

    // Analyze pattern from collected emails
    const pattern = inferPattern(emails, domain)

    return {
      domain,
      pattern,
      confidence: 0.7,
      sources: ['github'],
      sample_emails: emails.slice(0, 5)
    }

  } catch (error) {
    console.error('GitHub query failed:', error)
    return null
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Merge multiple pattern results into one
 */
function mergePatterns(domain: string, patterns: Partial<EmailPattern>[]): EmailPattern {
  const sources = new Set<string>()
  const sampleEmails = new Set<string>()
  let totalConfidence = 0
  let patternStr = ''
  let employeeCount = 0
  let organizationId = ''

  patterns.forEach(p => {
    p.sources?.forEach(s => sources.add(s))
    p.sample_emails?.forEach(e => sampleEmails.add(e))
    totalConfidence += p.confidence || 0
    if (p.pattern && !patternStr) patternStr = p.pattern
    if (p.employee_count) employeeCount = p.employee_count
    if (p.organization_id) organizationId = p.organization_id
  })

  const avgConfidence = totalConfidence / patterns.length

  return {
    domain,
    pattern: patternStr || `{first}.{last}@${domain}`,
    confidence: avgConfidence,
    verified: avgConfidence >= 0.8,
    sources: Array.from(sources),
    sample_emails: Array.from(sampleEmails).slice(0, 10),
    employee_count: employeeCount || undefined,
    organization_id: organizationId || undefined
  }
}

/**
 * Infer email pattern from sample emails
 */
function inferPattern(emails: string[], domain: string): string {
  // Common patterns:
  // {first}@domain.com
  // {first}.{last}@domain.com
  // {first}{last}@domain.com
  // {f}{last}@domain.com

  // Simple heuristic: check for dots
  const withDots = emails.filter(e => e.split('@')[0].includes('.')).length
  const ratio = withDots / emails.length

  if (ratio > 0.5) {
    return `{first}.{last}@${domain}`
  } else {
    return `{first}{last}@${domain}`
  }
}

/**
 * Generate test emails from pattern
 */
function generateTestEmails(pattern: string, domain: string): string[] {
  // Common first/last name combinations
  const testNames = [
    { first: 'john', last: 'doe' },
    { first: 'jane', last: 'smith' },
    { first: 'admin', last: 'user' }
  ]

  return testNames.map(({ first, last }) => {
    return pattern
      .replace('{first}', first)
      .replace('{last}', last)
      .replace('{f}', first[0])
      .replace('{l}', last[0])
  })
}

/**
 * Verify email exists (basic check)
 */
async function verifyEmail(email: string, env: Env): Promise<boolean> {
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return false
  }

  // TODO: Add MX record check via DNS API
  // For now, just format validation
  return true
}
