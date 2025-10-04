/**
 * TheOrg.com Organization Data Scraper
 *
 * Scrapes organizational structure and people data from TheOrg.com
 *
 * TheOrg is a Next.js application that embeds data in __NEXT_DATA__ JSON.
 * We can extract this JSON directly from the page HTML without browser automation.
 *
 * Data extracted:
 * - Organization metadata (name, industry, size, location)
 * - Org chart structure (reporting relationships)
 * - People data (names, titles, LinkedIn profiles, emails)
 * - Department structure
 *
 * API Endpoints:
 * - POST /scrape/org - Scrape single organization (body: { url: string })
 * - POST /scrape/bulk - Bulk scrape (body: { urls: string[] })
 * - GET /status - Get scraping status
 *
 * Deployment:
 * - Can run in standard Workers (no browser needed if __NEXT_DATA__ is available)
 * - For JS-heavy sites, deploy to Cloudflare Container with Playwright
 *
 * Rate Limiting:
 * - Use proxy rotation to avoid blocking
 * - Implement delays between requests
 * - Respect robots.txt
 *
 * References:
 * - https://theorg.com/
 */

import { Hono } from 'hono'

export interface Env {
  DB: D1Database
  DATA_BUCKET: R2Bucket
  KV: KVNamespace
  INGESTION_QUEUE: Queue
  SCRAPING_QUEUE: Queue
  ANALYTICS: AnalyticsEngineDataset
  PROXY_USER?: string
  PROXY_PASS?: string
}

interface Organization {
  id: string
  name: string
  legal_name?: string
  domain?: string
  type?: string
  industry?: string
  employee_count?: number
  revenue?: number
  founded_year?: number
  country?: string
  state?: string
  city?: string
  lat?: number
  lng?: number
  website?: string
  linkedin_url?: string
  twitter_handle?: string
  github_org?: string
  org_chart?: any
  people?: Person[]
  data: any
}

interface Person {
  id: string
  name: string
  title?: string
  email?: string
  linkedin_url?: string
  department?: string
  reports_to?: string
  location?: string
}

interface IngestionRun {
  id?: number
  source: string
  run_type: string
  records_processed: number
  records_inserted: number
  records_updated: number
  records_failed: number
  started_at: string
  completed_at?: string
  duration_ms?: number
  status: 'running' | 'completed' | 'failed'
  error_message?: string
  cursor?: string
  data?: string
}

const app = new Hono<{ Bindings: Env }>()

// ============================================================================
// Scraping Endpoints
// ============================================================================

app.post('/scrape/org', async (c) => {
  const body = await c.req.json()
  const url = body.url as string

  if (!url || !url.includes('theorg.com')) {
    return c.json({ error: 'Valid TheOrg.com URL required' }, 400)
  }

  try {
    // Check cache first
    const orgSlug = extractOrgSlug(url)
    const cached = await c.env.KV.get(`theorg:${orgSlug}`, 'json')

    if (cached) {
      return c.json({
        status: 'cached',
        organization: cached,
        cache_age_hours: getCacheAgeHours((cached as any).scraped_at)
      })
    }

    // Scrape organization
    const orgData = await scrapeOrganization(url, c.env)

    if (!orgData) {
      return c.json({ error: 'Failed to scrape organization' }, 404)
    }

    // Cache for 7 days
    await c.env.KV.put(`theorg:${orgSlug}`, JSON.stringify(orgData), {
      expirationTtl: 7 * 86400
    })

    // Queue for ingestion
    await c.env.INGESTION_QUEUE.send({
      source: 'theorg',
      action: 'upsert',
      data: orgData,
      timestamp: Date.now()
    })

    return c.json({
      status: 'success',
      organization: orgData
    })
  } catch (error: any) {
    console.error(`Error scraping ${url}:`, error)
    return c.json({ error: error.message }, 500)
  }
})

app.post('/scrape/bulk', async (c) => {
  const body = await c.req.json()
  const urls = body.urls as string[]

  if (!Array.isArray(urls) || urls.length === 0) {
    return c.json({ error: 'urls array required in body' }, 400)
  }

  const runId = await createIngestionRun(c.env, {
    source: 'theorg',
    run_type: 'bulk_scrape',
    started_at: new Date().toISOString(),
    status: 'running',
    records_processed: 0,
    records_inserted: 0,
    records_updated: 0,
    records_failed: 0,
    data: JSON.stringify({ url_count: urls.length })
  })

  // Process in background
  c.executionCtx.waitUntil(
    processBulkScrapes(urls, runId, c.env)
  )

  return c.json({
    status: 'processing',
    run_id: runId,
    urls_count: urls.length
  })
})

app.get('/status', async (c) => {
  const recentRuns = await c.env.DB.prepare(`
    SELECT * FROM ingestion_runs
    WHERE source = 'theorg'
    ORDER BY started_at DESC
    LIMIT 10
  `).all()

  const syncState = await c.env.DB.prepare(`
    SELECT * FROM sync_state WHERE source = 'theorg'
  `).first()

  return c.json({
    recent_runs: recentRuns.results,
    sync_state: syncState
  })
})

// ============================================================================
// Scraping Functions
// ============================================================================

async function scrapeOrganization(url: string, env: Env): Promise<Organization | null> {
  // Fetch page HTML
  const html = await fetchPage(url, env)

  if (!html) {
    return null
  }

  // Extract __NEXT_DATA__ JSON
  const nextData = extractNextData(html)

  if (!nextData) {
    console.error('Failed to extract __NEXT_DATA__ from page')
    return null
  }

  // Parse organization data
  const orgData = parseOrganizationData(nextData, url)

  return orgData
}

async function fetchPage(url: string, env: Env): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }

    // Use proxy if configured
    let fetchUrl = url
    if (env.PROXY_USER && env.PROXY_PASS) {
      // Proxy configuration would go here
      // For now, direct fetch
    }

    const response = await fetch(fetchUrl, { headers })

    if (!response.ok) {
      console.error(`Failed to fetch page: ${response.status}`)
      return null
    }

    return await response.text()
  } catch (error) {
    console.error('Error fetching page:', error)
    return null
  }
}

function extractNextData(html: string): any {
  // Find __NEXT_DATA__ script tag
  const regex = /<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/
  const match = html.match(regex)

  if (!match || !match[1]) {
    return null
  }

  try {
    return JSON.parse(match[1])
  } catch (error) {
    console.error('Failed to parse __NEXT_DATA__ JSON:', error)
    return null
  }
}

function parseOrganizationData(nextData: any, sourceUrl: string): Organization {
  // Extract organization data from Next.js props
  const props = nextData.props?.pageProps || {}
  const org = props.organization || props.company || {}
  const orgChart = props.orgChart || props.chart || {}
  const people = props.people || props.members || []

  // Basic organization info
  const organization: Organization = {
    id: org.id || org.slug || extractOrgSlug(sourceUrl),
    name: org.name || org.displayName || '',
    legal_name: org.legalName || org.legal_name,
    domain: org.domain || org.website?.replace(/^https?:\/\/(www\.)?/, ''),
    type: org.type || org.organizationType,
    industry: org.industry || org.sector,
    employee_count: org.employeeCount || org.size || people.length,
    revenue: org.revenue,
    founded_year: org.foundedYear || org.founded,
    country: org.country || org.location?.country,
    state: org.state || org.location?.state,
    city: org.city || org.location?.city,
    lat: org.latitude || org.location?.lat,
    lng: org.longitude || org.location?.lng,
    website: org.website || org.url,
    linkedin_url: org.linkedinUrl || org.linkedin,
    twitter_handle: org.twitterHandle || org.twitter,
    github_org: org.githubOrg || org.github,
    org_chart: orgChart,
    people: parsePeople(people),
    data: nextData
  }

  return organization
}

function parsePeople(peopleData: any[]): Person[] {
  if (!Array.isArray(peopleData)) {
    return []
  }

  return peopleData.map(person => ({
    id: person.id || person.slug || '',
    name: person.name || person.displayName || '',
    title: person.title || person.position || person.role,
    email: person.email || person.contactEmail,
    linkedin_url: person.linkedinUrl || person.linkedin,
    department: person.department || person.team,
    reports_to: person.reportsTo || person.manager?.id,
    location: person.location?.city || person.city
  }))
}

function extractOrgSlug(url: string): string {
  // Extract org slug from URL like https://theorg.com/org/acme-corp
  const match = url.match(/theorg\.com\/org\/([^\/\?]+)/)
  return match ? match[1] : 'unknown'
}

function getCacheAgeHours(scrapedAt: string): number {
  const now = Date.now()
  const scraped = new Date(scrapedAt).getTime()
  return Math.floor((now - scraped) / (1000 * 60 * 60))
}

// ============================================================================
// Bulk Processing
// ============================================================================

async function processBulkScrapes(urls: string[], runId: number, env: Env) {
  let processed = 0
  let inserted = 0
  let failed = 0

  for (const url of urls) {
    try {
      // Check cache
      const orgSlug = extractOrgSlug(url)
      const cached = await env.KV.get(`theorg:${orgSlug}`, 'json')

      let orgData: Organization | null = null

      if (cached) {
        orgData = cached as Organization

        // Re-scrape if cache is older than 30 days
        if (getCacheAgeHours((orgData.data as any).scraped_at) > 720) {
          orgData = await scrapeOrganization(url, env)

          if (orgData) {
            await env.KV.put(`theorg:${orgSlug}`, JSON.stringify(orgData), {
              expirationTtl: 7 * 86400
            })
          }
        }
      } else {
        orgData = await scrapeOrganization(url, env)

        if (orgData) {
          await env.KV.put(`theorg:${orgSlug}`, JSON.stringify(orgData), {
            expirationTtl: 7 * 86400
          })
        }
      }

      if (orgData) {
        await env.INGESTION_QUEUE.send({
          source: 'theorg',
          action: 'upsert',
          data: orgData,
          timestamp: Date.now()
        })
        inserted++
      }

      processed++

      // Rate limiting: 2 req/sec
      await sleep(500)
    } catch (error) {
      console.error(`Error processing URL ${url}:`, error)
      failed++
    }
  }

  await updateIngestionRun(env, runId, {
    status: 'completed',
    records_processed: processed,
    records_inserted: inserted,
    records_failed: failed,
    completed_at: new Date().toISOString()
  })

  await env.DB.prepare(`
    INSERT OR REPLACE INTO sync_state (source, last_sync_time, updated_at)
    VALUES ('theorg', ?, datetime('now'))
  `).bind(new Date().toISOString()).run()
}

// ============================================================================
// Helper Functions
// ============================================================================

async function createIngestionRun(env: Env, run: Omit<IngestionRun, 'id'>): Promise<number> {
  const result = await env.DB.prepare(`
    INSERT INTO ingestion_runs (
      source, run_type, records_processed, records_inserted, records_updated,
      records_failed, started_at, completed_at, duration_ms, status,
      error_message, cursor, data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    run.source,
    run.run_type,
    run.records_processed,
    run.records_inserted,
    run.records_updated,
    run.records_failed,
    run.started_at,
    run.completed_at || null,
    run.duration_ms || null,
    run.status,
    run.error_message || null,
    run.cursor || null,
    run.data || null
  ).run()

  return result.meta.last_row_id as number
}

async function updateIngestionRun(
  env: Env,
  runId: number,
  updates: Partial<IngestionRun>
): Promise<void> {
  const fields: string[] = []
  const values: any[] = []

  if (updates.records_processed !== undefined) {
    fields.push('records_processed = ?')
    values.push(updates.records_processed)
  }
  if (updates.records_inserted !== undefined) {
    fields.push('records_inserted = ?')
    values.push(updates.records_inserted)
  }
  if (updates.records_updated !== undefined) {
    fields.push('records_updated = ?')
    values.push(updates.records_updated)
  }
  if (updates.records_failed !== undefined) {
    fields.push('records_failed = ?')
    values.push(updates.records_failed)
  }
  if (updates.completed_at) {
    fields.push('completed_at = ?')
    values.push(updates.completed_at)
  }
  if (updates.status) {
    fields.push('status = ?')
    values.push(updates.status)
  }
  if (updates.error_message) {
    fields.push('error_message = ?')
    values.push(updates.error_message)
  }

  if (fields.length === 0) return

  values.push(runId)

  await env.DB.prepare(`
    UPDATE ingestion_runs SET ${fields.join(', ')} WHERE id = ?
  `).bind(...values).run()
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// Scheduled Handler
// ============================================================================

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Running scheduled TheOrg refresh')

    try {
      // Get list of organizations to monitor from KV
      const orgsJson = await env.KV.get('theorg:monitored_orgs')
      if (!orgsJson) {
        console.log('No organizations configured for monitoring')
        return
      }

      const urls = JSON.parse(orgsJson) as string[]

      const runId = await createIngestionRun(env, {
        source: 'theorg',
        run_type: 'scheduled_refresh',
        started_at: new Date().toISOString(),
        status: 'running',
        records_processed: 0,
        records_inserted: 0,
        records_updated: 0,
        records_failed: 0,
        data: JSON.stringify({ url_count: urls.length })
      })

      await processBulkScrapes(urls, runId, env)

      console.log(`Scheduled refresh completed: ${urls.length} organizations scraped`)
    } catch (error) {
      console.error('Scheduled refresh failed:', error)
    }
  }
}
