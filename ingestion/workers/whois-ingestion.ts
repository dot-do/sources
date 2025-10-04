/**
 * WHOIS Data Ingestion Worker
 *
 * Ingests domain registration data using:
 * 1. RDAP (Registration Data Access Protocol) - Modern JSON-based API
 * 2. Legacy WHOIS - Port 43 text protocol (fallback)
 * 3. WhoisXML API - Commercial API for reliable data
 *
 * Data collected:
 * - Registrant info (name, email, organization) - often redacted due to GDPR
 * - Registrar details (name, ID, contact info)
 * - Registration dates (created, updated, expires)
 * - Nameservers
 * - Domain status codes
 * - DNSSEC info
 *
 * API Endpoints:
 * - GET /lookup?domain=<domain> - Lookup single domain
 * - POST /lookup/bulk - Bulk domain lookup (body: { domains: string[] })
 * - GET /status - Get sync status
 *
 * Scheduled:
 * - Daily cron: Re-check expiring domains
 *
 * References:
 * - https://rdap.org/
 * - https://www.iana.org/assignments/rdap-dns/rdap-dns.xhtml
 * - https://whoisxmlapi.com/
 */

import { Hono } from 'hono'

export interface Env {
  DB: D1Database
  DATA_BUCKET: R2Bucket
  KV: KVNamespace
  INGESTION_QUEUE: Queue
  ANALYTICS: AnalyticsEngineDataset
  WHOISXML_API_KEY?: string
}

interface WhoisRecord {
  domain: string
  registrant_name?: string
  registrant_email?: string
  registrant_organization?: string
  registrant_country?: string
  registrar_name?: string
  registrar_id?: string
  registrar_url?: string
  registrar_abuse_email?: string
  registrar_abuse_phone?: string
  created_date?: string
  updated_date?: string
  expiry_date?: string
  nameservers: string[]
  status_codes: string[]
  dnssec?: string
  raw_whois?: string
  data: any
  last_checked_at: string
}

interface RDAPResponse {
  objectClassName: string
  handle?: string
  ldhName: string
  nameservers?: Array<{
    ldhName: string
  }>
  status?: string[]
  events?: Array<{
    eventAction: string
    eventDate: string
  }>
  entities?: Array<{
    objectClassName: string
    handle?: string
    roles?: string[]
    vcardArray?: any[]
    publicIds?: Array<{
      type: string
      identifier: string
    }>
  }>
  secureDNS?: {
    delegationSigned: boolean
    dsData?: any[]
  }
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

// RDAP server URLs by TLD
const RDAP_SERVERS: Record<string, string> = {
  'com': 'https://rdap.verisign.com/com/v1',
  'net': 'https://rdap.verisign.com/net/v1',
  'org': 'https://rdap.publicinterestregistry.org',
  'io': 'https://rdap.nic.io',
  'dev': 'https://rdap.nic.google',
  'app': 'https://rdap.nic.google',
  'xyz': 'https://rdap.centralnic.com/xyz',
  'ai': 'https://rdap.nic.ai',
  'co': 'https://rdap.nic.co',
  'me': 'https://rdap.nic.me',
  // Add more as needed
}

// ============================================================================
// Lookup Endpoints
// ============================================================================

app.get('/lookup', async (c) => {
  const domain = c.req.query('domain')

  if (!domain) {
    return c.json({ error: 'domain query parameter required' }, 400)
  }

  try {
    // Check cache first
    const cached = await c.env.KV.get(`whois:${domain}`, 'json')
    if (cached) {
      return c.json({
        status: 'cached',
        domain,
        data: cached,
        cache_age_hours: getCacheAgeHours(cached.last_checked_at)
      })
    }

    // Lookup WHOIS data
    const whoisData = await lookupDomain(domain, c.env)

    if (!whoisData) {
      return c.json({ error: 'Domain not found or lookup failed' }, 404)
    }

    // Cache for 24 hours
    await c.env.KV.put(`whois:${domain}`, JSON.stringify(whoisData), {
      expirationTtl: 86400
    })

    // Queue for ingestion
    await c.env.INGESTION_QUEUE.send({
      source: 'whois',
      action: 'upsert',
      data: whoisData,
      timestamp: Date.now()
    })

    return c.json({
      status: 'success',
      domain,
      data: whoisData
    })
  } catch (error: any) {
    console.error(`Error looking up domain ${domain}:`, error)
    return c.json({ error: error.message }, 500)
  }
})

app.post('/lookup/bulk', async (c) => {
  const body = await c.req.json()
  const domains = body.domains as string[]

  if (!Array.isArray(domains) || domains.length === 0) {
    return c.json({ error: 'domains array required in body' }, 400)
  }

  const runId = await createIngestionRun(c.env, {
    source: 'whois',
    run_type: 'bulk_lookup',
    started_at: new Date().toISOString(),
    status: 'running',
    records_processed: 0,
    records_inserted: 0,
    records_updated: 0,
    records_failed: 0,
    data: JSON.stringify({ domain_count: domains.length })
  })

  // Process in background
  c.executionCtx.waitUntil(
    processBulkLookups(domains, runId, c.env)
  )

  return c.json({
    status: 'processing',
    run_id: runId,
    domains_count: domains.length
  })
})

app.get('/status', async (c) => {
  const recentRuns = await c.env.DB.prepare(`
    SELECT * FROM ingestion_runs
    WHERE source = 'whois'
    ORDER BY started_at DESC
    LIMIT 10
  `).all()

  const syncState = await c.env.DB.prepare(`
    SELECT * FROM sync_state WHERE source = 'whois'
  `).first()

  return c.json({
    recent_runs: recentRuns.results,
    sync_state: syncState
  })
})

// ============================================================================
// WHOIS Lookup Functions
// ============================================================================

async function lookupDomain(domain: string, env: Env): Promise<WhoisRecord | null> {
  const tld = extractTld(domain)

  // Try RDAP first (preferred)
  try {
    const rdapData = await lookupRDAP(domain, tld)
    if (rdapData) {
      return rdapData
    }
  } catch (error) {
    console.warn(`RDAP lookup failed for ${domain}:`, error)
  }

  // Try WhoisXML API if configured
  if (env.WHOISXML_API_KEY) {
    try {
      const whoisXMLData = await lookupWhoisXML(domain, env)
      if (whoisXMLData) {
        return whoisXMLData
      }
    } catch (error) {
      console.warn(`WhoisXML API lookup failed for ${domain}:`, error)
    }
  }

  // Fallback: Legacy WHOIS (port 43) not supported in Workers
  // Would need external service or container
  console.warn(`All lookup methods failed for ${domain}`)
  return null
}

async function lookupRDAP(domain: string, tld: string): Promise<WhoisRecord | null> {
  const rdapServer = RDAP_SERVERS[tld]

  if (!rdapServer) {
    // Try IANA RDAP bootstrap
    const bootstrapUrl = `https://rdap-bootstrap.arin.net/bootstrap/domain/${domain}`
    const bootstrapResponse = await fetch(bootstrapUrl, {
      headers: { 'Accept': 'application/json' }
    })

    if (!bootstrapResponse.ok) {
      throw new Error(`RDAP bootstrap failed: ${bootstrapResponse.status}`)
    }

    const redirectUrl = bootstrapResponse.url
    return await fetchRDAPData(redirectUrl)
  }

  const rdapUrl = `${rdapServer}/domain/${domain}`
  return await fetchRDAPData(rdapUrl)
}

async function fetchRDAPData(url: string): Promise<WhoisRecord | null> {
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`RDAP query failed: ${response.status}`)
  }

  const rdapData: RDAPResponse = await response.json()

  // Parse RDAP response into WhoisRecord
  const record: WhoisRecord = {
    domain: rdapData.ldhName,
    nameservers: rdapData.nameservers?.map(ns => ns.ldhName) || [],
    status_codes: rdapData.status || [],
    dnssec: rdapData.secureDNS?.delegationSigned ? 'signed' : 'unsigned',
    data: rdapData,
    last_checked_at: new Date().toISOString()
  }

  // Parse events (dates)
  if (rdapData.events) {
    for (const event of rdapData.events) {
      switch (event.eventAction) {
        case 'registration':
          record.created_date = event.eventDate
          break
        case 'last changed':
        case 'last update of RDAP database':
          record.updated_date = event.eventDate
          break
        case 'expiration':
          record.expiry_date = event.eventDate
          break
      }
    }
  }

  // Parse entities (registrant, registrar)
  if (rdapData.entities) {
    for (const entity of rdapData.entities) {
      const roles = entity.roles || []

      if (roles.includes('registrar')) {
        record.registrar_name = extractVCardField(entity.vcardArray, 'fn')
        record.registrar_url = extractVCardField(entity.vcardArray, 'url')
        record.registrar_abuse_email = extractVCardField(entity.vcardArray, 'email')

        // Get registrar ID from publicIds
        if (entity.publicIds) {
          const ianaId = entity.publicIds.find(id => id.type === 'IANA Registrar ID')
          if (ianaId) {
            record.registrar_id = ianaId.identifier
          }
        }
      }

      if (roles.includes('registrant')) {
        record.registrant_name = extractVCardField(entity.vcardArray, 'fn')
        record.registrant_email = extractVCardField(entity.vcardArray, 'email')
        record.registrant_organization = extractVCardField(entity.vcardArray, 'org')

        const address = extractVCardField(entity.vcardArray, 'adr')
        if (address && Array.isArray(address)) {
          // Address format: [country_code, region, locality, street, ...]
          record.registrant_country = address[6] || address[0]
        }
      }
    }
  }

  return record
}

async function lookupWhoisXML(domain: string, env: Env): Promise<WhoisRecord | null> {
  const apiKey = env.WHOISXML_API_KEY!
  const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${domain}&outputFormat=JSON`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`WhoisXML API failed: ${response.status}`)
  }

  const data = await response.json()

  if (!data.WhoisRecord) {
    return null
  }

  const whois = data.WhoisRecord

  const record: WhoisRecord = {
    domain: whois.domainName,
    registrant_name: whois.registrant?.name,
    registrant_email: whois.registrant?.email,
    registrant_organization: whois.registrant?.organization,
    registrant_country: whois.registrant?.country,
    registrar_name: whois.registrarName,
    registrar_id: whois.registrarIANAID,
    registrar_abuse_email: whois.contactEmail,
    created_date: whois.createdDate,
    updated_date: whois.updatedDate,
    expiry_date: whois.expiresDate,
    nameservers: whois.nameServers?.hostNames || [],
    status_codes: whois.status ? [whois.status] : [],
    dnssec: whois.dnssec,
    raw_whois: whois.rawText,
    data: data,
    last_checked_at: new Date().toISOString()
  }

  return record
}

function extractVCardField(vcardArray: any[] | undefined, fieldName: string): string | any[] | undefined {
  if (!vcardArray || !Array.isArray(vcardArray)) {
    return undefined
  }

  for (const vcard of vcardArray) {
    if (!Array.isArray(vcard)) continue

    for (const field of vcard) {
      if (!Array.isArray(field)) continue

      if (field[0] === fieldName) {
        return field[3]
      }
    }
  }

  return undefined
}

function extractTld(domain: string): string {
  const parts = domain.toLowerCase().split('.')
  return parts[parts.length - 1]
}

function getCacheAgeHours(lastChecked: string): number {
  const now = Date.now()
  const checked = new Date(lastChecked).getTime()
  return Math.floor((now - checked) / (1000 * 60 * 60))
}

// ============================================================================
// Bulk Processing
// ============================================================================

async function processBulkLookups(domains: string[], runId: number, env: Env) {
  let processed = 0
  let inserted = 0
  let failed = 0

  for (const domain of domains) {
    try {
      // Check cache first
      const cached = await env.KV.get(`whois:${domain}`, 'json')
      let whoisData: WhoisRecord | null = null

      if (cached) {
        whoisData = cached as WhoisRecord

        // Re-check if cache is older than 7 days
        if (getCacheAgeHours(whoisData.last_checked_at) > 168) {
          whoisData = await lookupDomain(domain, env)

          if (whoisData) {
            await env.KV.put(`whois:${domain}`, JSON.stringify(whoisData), {
              expirationTtl: 86400
            })
          }
        }
      } else {
        whoisData = await lookupDomain(domain, env)

        if (whoisData) {
          await env.KV.put(`whois:${domain}`, JSON.stringify(whoisData), {
            expirationTtl: 86400
          })
        }
      }

      if (whoisData) {
        await env.INGESTION_QUEUE.send({
          source: 'whois',
          action: 'upsert',
          data: whoisData,
          timestamp: Date.now()
        })
        inserted++
      }

      processed++

      // Rate limiting: 1 req/sec
      await sleep(1000)
    } catch (error) {
      console.error(`Error processing domain ${domain}:`, error)
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
    VALUES ('whois', ?, datetime('now'))
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
    console.log('Running scheduled WHOIS refresh for expiring domains')

    try {
      // Get domains expiring in next 30 days from KV or DB
      const expiringDomainsJson = await env.KV.get('whois:expiring_domains')
      if (!expiringDomainsJson) {
        console.log('No expiring domains configured for monitoring')
        return
      }

      const domains = JSON.parse(expiringDomainsJson) as string[]

      const runId = await createIngestionRun(env, {
        source: 'whois',
        run_type: 'scheduled_expiring_refresh',
        started_at: new Date().toISOString(),
        status: 'running',
        records_processed: 0,
        records_inserted: 0,
        records_updated: 0,
        records_failed: 0,
        data: JSON.stringify({ domain_count: domains.length })
      })

      await processBulkLookups(domains, runId, env)

      console.log(`Scheduled refresh completed: ${domains.length} domains checked`)
    } catch (error) {
      console.error('Scheduled refresh failed:', error)
    }
  }
}
