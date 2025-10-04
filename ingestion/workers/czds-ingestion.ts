/**
 * CZDS (Centralized Zone Data Service) Zone File Ingestion Worker
 *
 * Ingests TLD zone files from ICANN's CZDS service
 *
 * CZDS provides access to zone files for generic TLDs (.com, .net, .org, etc.)
 * and new gTLDs (.xyz, .app, .dev, etc.)
 *
 * Zone files contain DNS records for all domains under a TLD:
 * - NS (nameserver) records
 * - A/AAAA (IP address) records
 * - MX (mail exchange) records
 * - TXT records
 * - DNSSEC (DS, DNSKEY) records
 *
 * API Endpoints:
 * - GET /sync/list - List available TLD zone files
 * - GET /sync/tld?tld=<tld> - Download and process single TLD zone file
 * - POST /sync/bulk - Bulk download multiple TLDs (body: { tlds: string[] })
 * - GET /status - Get sync status
 *
 * Scheduled:
 * - Daily cron: Download all available TLD zone files
 *
 * Storage Strategy:
 * 1. Raw zone files stored in R2: zones/{tld}/{date}.zone
 * 2. Parsed domain records queued for structured storage
 *
 * Authentication:
 * - CZDS requires username/password and approved access
 * - Set CZDS_USERNAME and CZDS_PASSWORD secrets
 *
 * References:
 * - https://czds.icann.org
 * - https://github.com/icann/czds-api-client-java
 */

import { Hono } from 'hono'

export interface Env {
  DB: D1Database
  DATA_BUCKET: R2Bucket
  KV: KVNamespace
  INGESTION_QUEUE: Queue
  ANALYTICS: AnalyticsEngineDataset
  CZDS_USERNAME?: string
  CZDS_PASSWORD?: string
  CZDS_API_URL?: string
}

interface CZDSZoneFile {
  id: string
  tld: string
  downloadUrl: string
  size: number
  lastModified: string
  status: string
}

interface DomainRecord {
  domain: string
  tld: string
  nameservers: string[]
  a_records: string[]
  aaaa_records: string[]
  mx_records: Array<{ priority: number, hostname: string }>
  txt_records: string[]
  dnssec_enabled: boolean
  ds_records: string[]
  dnskey_records: string[]
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
// Sync Endpoints
// ============================================================================

app.get('/sync/list', async (c) => {
  try {
    const token = await authenticate(c.env)
    const zoneFiles = await listAvailableZones(token, c.env)

    return c.json({
      status: 'success',
      zone_files: zoneFiles,
      count: zoneFiles.length
    })
  } catch (error: any) {
    console.error('Error listing zones:', error)
    return c.json({ error: error.message }, 500)
  }
})

app.get('/sync/tld', async (c) => {
  const tld = c.req.query('tld')

  if (!tld) {
    return c.json({ error: 'tld query parameter required' }, 400)
  }

  try {
    const token = await authenticate(c.env)
    const result = await downloadAndProcessZone(tld, token, c.env)

    return c.json({
      status: 'completed',
      tld,
      domains_processed: result.domains_processed,
      file_size: result.file_size,
      r2_key: result.r2_key
    })
  } catch (error: any) {
    console.error(`Error processing TLD ${tld}:`, error)
    return c.json({ error: error.message }, 500)
  }
})

app.post('/sync/bulk', async (c) => {
  const body = await c.req.json()
  const tlds = body.tlds as string[]

  if (!Array.isArray(tlds) || tlds.length === 0) {
    return c.json({ error: 'tlds array required in body' }, 400)
  }

  const runId = await createIngestionRun(c.env, {
    source: 'czds',
    run_type: 'bulk_zone_sync',
    started_at: new Date().toISOString(),
    status: 'running',
    records_processed: 0,
    records_inserted: 0,
    records_updated: 0,
    records_failed: 0,
    data: JSON.stringify({ tlds })
  })

  // Process in background
  c.executionCtx.waitUntil(
    processBulkZones(tlds, runId, c.env)
  )

  return c.json({
    status: 'processing',
    run_id: runId,
    tlds_count: tlds.length
  })
})

app.get('/status', async (c) => {
  const recentRuns = await c.env.DB.prepare(`
    SELECT * FROM ingestion_runs
    WHERE source = 'czds'
    ORDER BY started_at DESC
    LIMIT 10
  `).all()

  const syncState = await c.env.DB.prepare(`
    SELECT * FROM sync_state WHERE source = 'czds'
  `).first()

  return c.json({
    recent_runs: recentRuns.results,
    sync_state: syncState
  })
})

// ============================================================================
// CZDS API Functions
// ============================================================================

async function authenticate(env: Env): Promise<string> {
  const apiUrl = env.CZDS_API_URL || 'https://czds-api.icann.org'

  if (!env.CZDS_USERNAME || !env.CZDS_PASSWORD) {
    throw new Error('CZDS credentials not configured')
  }

  // Check cache first
  const cachedToken = await env.KV.get('czds:token')
  if (cachedToken) {
    return cachedToken
  }

  // Authenticate
  const response = await fetch(`${apiUrl}/api/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      username: env.CZDS_USERNAME,
      password: env.CZDS_PASSWORD
    })
  })

  if (!response.ok) {
    throw new Error(`CZDS authentication failed: ${response.status}`)
  }

  const data = await response.json()
  const token = data.accessToken

  // Cache token for 23 hours (tokens expire in 24 hours)
  await env.KV.put('czds:token', token, { expirationTtl: 23 * 60 * 60 })

  return token
}

async function listAvailableZones(token: string, env: Env): Promise<CZDSZoneFile[]> {
  const apiUrl = env.CZDS_API_URL || 'https://czds-api.icann.org'

  const response = await fetch(`${apiUrl}/api/czds/downloads/links`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to list zones: ${response.status}`)
  }

  const links = await response.json() as string[]

  return links.map(url => {
    const tld = extractTldFromUrl(url)
    return {
      id: tld,
      tld,
      downloadUrl: url,
      size: 0,
      lastModified: new Date().toISOString(),
      status: 'available'
    }
  })
}

async function downloadZoneFile(downloadUrl: string, token: string, env: Env): Promise<string> {
  const response = await fetch(downloadUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': '*/*'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to download zone file: ${response.status}`)
  }

  return await response.text()
}

function extractTldFromUrl(url: string): string {
  // Extract TLD from URL like https://czds-api.icann.org/api/czds/downloads/com.txt.gz
  const match = url.match(/\/([^\/]+)\.txt(?:\.gz)?$/)
  return match ? match[1] : 'unknown'
}

// ============================================================================
// Zone File Processing
// ============================================================================

async function downloadAndProcessZone(
  tld: string,
  token: string,
  env: Env
): Promise<{ domains_processed: number, file_size: number, r2_key: string }> {
  // Get download URL
  const zones = await listAvailableZones(token, env)
  const zone = zones.find(z => z.tld === tld)

  if (!zone) {
    throw new Error(`Zone file not available for TLD: ${tld}`)
  }

  // Download zone file
  const zoneContent = await downloadZoneFile(zone.downloadUrl, token, env)
  const fileSize = Buffer.byteLength(zoneContent)

  // Store raw zone file in R2
  const date = new Date().toISOString().split('T')[0]
  const r2Key = `zones/${tld}/${date}.zone`

  await env.DATA_BUCKET.put(r2Key, zoneContent, {
    httpMetadata: {
      contentType: 'text/plain'
    },
    customMetadata: {
      tld,
      ingestion_date: new Date().toISOString(),
      file_size: String(fileSize)
    }
  })

  // Parse zone file
  const domains = parseZoneFile(zoneContent, tld)

  // Queue domains in batches
  const batchSize = 100
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize)

    await env.INGESTION_QUEUE.send({
      source: 'czds',
      action: 'upsert',
      data: {
        type: 'domain_batch',
        tld,
        domains: batch
      },
      timestamp: Date.now()
    })
  }

  return {
    domains_processed: domains.length,
    file_size: fileSize,
    r2_key: r2Key
  }
}

function parseZoneFile(content: string, tld: string): DomainRecord[] {
  const domains = new Map<string, DomainRecord>()
  const lines = content.split('\n')

  let currentDomain: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith(';')) {
      continue
    }

    // Parse DNS record
    const parts = trimmed.split(/\s+/)
    if (parts.length < 4) {
      continue
    }

    const [name, ttl, recordClass, recordType, ...valuesParts] = parts
    const value = valuesParts.join(' ')

    // Normalize domain name
    let domain = name
    if (domain === '@') {
      domain = tld
    } else if (domain.endsWith('.')) {
      domain = domain.slice(0, -1)
    } else {
      domain = `${domain}.${tld}`
    }

    // Initialize domain record if new
    if (!domains.has(domain)) {
      domains.set(domain, {
        domain,
        tld,
        nameservers: [],
        a_records: [],
        aaaa_records: [],
        mx_records: [],
        txt_records: [],
        dnssec_enabled: false,
        ds_records: [],
        dnskey_records: []
      })
    }

    const record = domains.get(domain)!

    // Parse by record type
    switch (recordType.toUpperCase()) {
      case 'NS':
        if (!record.nameservers.includes(value)) {
          record.nameservers.push(value)
        }
        break

      case 'A':
        if (!record.a_records.includes(value)) {
          record.a_records.push(value)
        }
        break

      case 'AAAA':
        if (!record.aaaa_records.includes(value)) {
          record.aaaa_records.push(value)
        }
        break

      case 'MX':
        const mxParts = value.split(' ')
        if (mxParts.length >= 2) {
          const priority = parseInt(mxParts[0])
          const hostname = mxParts[1]
          record.mx_records.push({ priority, hostname })
        }
        break

      case 'TXT':
        const txtValue = value.replace(/^"|"$/g, '')
        if (!record.txt_records.includes(txtValue)) {
          record.txt_records.push(txtValue)
        }
        break

      case 'DS':
        record.dnssec_enabled = true
        if (!record.ds_records.includes(value)) {
          record.ds_records.push(value)
        }
        break

      case 'DNSKEY':
        record.dnssec_enabled = true
        if (!record.dnskey_records.includes(value)) {
          record.dnskey_records.push(value)
        }
        break
    }
  }

  return Array.from(domains.values())
}

// ============================================================================
// Bulk Processing
// ============================================================================

async function processBulkZones(tlds: string[], runId: number, env: Env) {
  const token = await authenticate(env)
  let processed = 0
  let inserted = 0
  let failed = 0

  for (const tld of tlds) {
    try {
      const result = await downloadAndProcessZone(tld, token, env)

      processed++
      inserted += result.domains_processed

      console.log(`Processed TLD ${tld}: ${result.domains_processed} domains`)

      // Small delay between TLD downloads
      await sleep(2000)
    } catch (error) {
      console.error(`Error processing TLD ${tld}:`, error)
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

  // Update sync state
  await env.DB.prepare(`
    INSERT OR REPLACE INTO sync_state (source, last_sync_time, updated_at)
    VALUES ('czds', ?, datetime('now'))
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
    console.log('Running scheduled CZDS zone file sync')

    try {
      const token = await authenticate(env)
      const zones = await listAvailableZones(token, env)

      const runId = await createIngestionRun(env, {
        source: 'czds',
        run_type: 'scheduled_full_sync',
        started_at: new Date().toISOString(),
        status: 'running',
        records_processed: 0,
        records_inserted: 0,
        records_updated: 0,
        records_failed: 0,
        data: JSON.stringify({ zone_count: zones.length })
      })

      // Process all available zones
      const tlds = zones.map(z => z.tld)
      await processBulkZones(tlds, runId, env)

      console.log(`Scheduled sync completed: ${zones.length} TLDs processed`)
    } catch (error) {
      console.error('Scheduled sync failed:', error)
    }
  }
}
