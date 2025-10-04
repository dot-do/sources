/**
 * PyPI Package Ingestion Worker
 *
 * Syncs package data from PyPI registry using:
 * 1. XML-RPC API for package list (initial load)
 * 2. JSON API for package details
 * 3. RSS feeds for recent updates (incremental)
 *
 * Data flow:
 * PyPI API → This Worker → Queue → Processor → D1/R2
 */

export interface Env {
  DB: D1Database
  RAW_BUCKET: R2Bucket
  KV: KVNamespace
  INGESTION_QUEUE: Queue
  ANALYTICS: AnalyticsEngineDataset

  // Secrets
  PYPI_API_URL?: string
}

interface PyPiPackageInfo {
  name: string
  version: string
  summary?: string
  description?: string
  author?: string
  author_email?: string
  license?: string
  home_page?: string
  project_url?: string
  project_urls?: Record<string, string>
  requires_dist?: string[]
  keywords?: string
  classifiers?: string[]
}

interface PyPiPackage {
  info: PyPiPackageInfo
  releases: Record<string, any[]>
  urls: any[]
  last_serial: number
}

interface IngestMessage {
  source: 'pypi'
  action: 'upsert' | 'delete'
  data: PyPiPackage
  timestamp: number
}

// ============================================================================
// Main Worker
// ============================================================================

export default {
  /**
   * HTTP handler for manual triggers
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    try {
      // Route based on path
      if (url.pathname === '/sync/full') {
        return await handleFullSync(env)
      }

      if (url.pathname === '/sync/incremental') {
        return await handleIncrementalSync(env)
      }

      if (url.pathname === '/sync/package') {
        const packageName = url.searchParams.get('name')
        if (!packageName) {
          return Response.json({ error: 'Missing package name' }, { status: 400 })
        }
        return await handleSinglePackage(packageName, env)
      }

      if (url.pathname === '/status') {
        return await handleStatus(env)
      }

      return Response.json({
        service: 'pypi-ingestion',
        endpoints: {
          '/sync/full': 'Full sync of all packages',
          '/sync/incremental': 'Incremental sync from RSS feed',
          '/sync/package?name=<name>': 'Sync single package',
          '/status': 'Ingestion status'
        }
      })

    } catch (error) {
      console.error('PyPI ingestion error:', error)
      return Response.json({
        error: error.message
      }, { status: 500 })
    }
  },

  /**
   * Scheduled trigger (runs daily)
   */
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log('Starting scheduled PyPI sync')

    try {
      // Run incremental sync (last 24 hours from RSS)
      const result = await runIncrementalSync(env)

      console.log('Scheduled sync complete:', result)

      // Track metrics
      await trackMetrics(env, 'scheduled_sync', result)

    } catch (error) {
      console.error('Scheduled sync failed:', error)
      await trackMetrics(env, 'scheduled_sync_error', { error: error.message })
    }
  }
}

// ============================================================================
// Full Sync (Initial Load)
// ============================================================================

async function handleFullSync(env: Env): Promise<Response> {
  const apiUrl = env.PYPI_API_URL || 'https://pypi.org'

  // Track ingestion run
  const runId = await createIngestionRun(env, 'full_sync')

  try {
    console.log('Starting full PyPI sync from', apiUrl)

    // Get all package names from simple index
    const response = await fetch(`${apiUrl}/simple/`)

    if (!response.ok) {
      throw new Error(`PyPI returned ${response.status}`)
    }

    // Parse HTML to extract package names
    const html = await response.text()
    const packageNames = extractPackageNames(html)

    console.log(`Found ${packageNames.length} packages`)

    let queued = 0
    let failed = 0

    // Queue packages in batches
    const batchSize = 100
    for (let i = 0; i < packageNames.length; i += batchSize) {
      const batch = packageNames.slice(i, i + batchSize)

      // Queue each package for detailed fetch
      const promises = batch.map(async (name) => {
        try {
          await env.INGESTION_QUEUE.send({
            source: 'pypi',
            action: 'upsert',
            data: { info: { name } } as PyPiPackage,
            timestamp: Date.now()
          } as IngestMessage)
          queued++
        } catch (error) {
          console.error(`Failed to queue ${name}:`, error)
          failed++
        }
      })

      await Promise.all(promises)

      // Progress logging
      if ((i + batchSize) % 1000 === 0) {
        console.log(`Queued ${i + batchSize}/${packageNames.length} packages`)
      }
    }

    // Update ingestion run
    await completeIngestionRun(env, runId, {
      records_processed: packageNames.length,
      records_inserted: queued,
      records_failed: failed
    })

    return Response.json({
      status: 'completed',
      total: packageNames.length,
      queued,
      failed
    })

  } catch (error) {
    await failIngestionRun(env, runId, error.message)
    throw error
  }
}

// ============================================================================
// Incremental Sync (Recent Updates via RSS)
// ============================================================================

async function handleIncrementalSync(env: Env): Promise<Response> {
  const result = await runIncrementalSync(env)
  return Response.json(result)
}

async function runIncrementalSync(env: Env) {
  const apiUrl = env.PYPI_API_URL || 'https://pypi.org'

  const runId = await createIngestionRun(env, 'incremental')

  try {
    console.log('Starting incremental PyPI sync')

    // Get last sync timestamp
    const lastSync = await getLastSyncTime(env)
    const since = lastSync ? new Date(lastSync) : new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Fetch RSS feed for recent updates
    const response = await fetch(`${apiUrl}/rss/updates.xml`)

    if (!response.ok) {
      throw new Error(`PyPI returned ${response.status}`)
    }

    const xml = await response.text()
    const updates = parseRssFeed(xml, since)

    console.log(`Processing ${updates.length} recent updates`)

    let queued = 0
    let failed = 0

    // Queue updated packages
    for (const packageName of updates) {
      try {
        await env.INGESTION_QUEUE.send({
          source: 'pypi',
          action: 'upsert',
          data: { info: { name: packageName } } as PyPiPackage,
          timestamp: Date.now()
        } as IngestMessage)
        queued++
      } catch (error) {
        console.error(`Failed to queue ${packageName}:`, error)
        failed++
      }
    }

    // Save sync timestamp
    await saveLastSyncTime(env, new Date().toISOString())

    // Update ingestion run
    await completeIngestionRun(env, runId, {
      records_processed: updates.length,
      records_inserted: queued,
      records_failed: failed
    })

    return {
      status: 'completed',
      updates: updates.length,
      queued,
      failed,
      since: since.toISOString()
    }

  } catch (error) {
    await failIngestionRun(env, runId, error.message)
    throw error
  }
}

// ============================================================================
// Single Package Sync
// ============================================================================

async function handleSinglePackage(packageName: string, env: Env): Promise<Response> {
  const apiUrl = env.PYPI_API_URL || 'https://pypi.org'

  try {
    console.log(`Fetching package: ${packageName}`)

    // Fetch package metadata from JSON API
    const response = await fetch(`${apiUrl}/pypi/${packageName}/json`)

    if (!response.ok) {
      if (response.status === 404) {
        return Response.json({ error: 'Package not found' }, { status: 404 })
      }
      throw new Error(`PyPI returned ${response.status}`)
    }

    const packageData = await response.json<PyPiPackage>()

    // Queue for processing
    await env.INGESTION_QUEUE.send({
      source: 'pypi',
      action: 'upsert',
      data: packageData,
      timestamp: Date.now()
    } as IngestMessage)

    return Response.json({
      status: 'queued',
      package: packageName,
      version: packageData.info.version
    })

  } catch (error) {
    console.error(`Failed to fetch package ${packageName}:`, error)
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
    // Get last sync time
    const lastSync = await getLastSyncTime(env)

    // Get recent ingestion runs
    const runs = await env.DB.prepare(`
      SELECT * FROM ingestion_runs
      WHERE source = 'pypi'
      ORDER BY started_at DESC
      LIMIT 10
    `).all()

    // Get package count
    const count = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM packages WHERE ns = 'pypi'
    `).first<{ count: number }>()

    return Response.json({
      service: 'pypi-ingestion',
      last_sync: lastSync,
      total_packages: count?.count || 0,
      recent_runs: runs.results
    })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract package names from PyPI simple index HTML
 */
function extractPackageNames(html: string): string[] {
  const packageNames: string[] = []

  // Match <a> tags in the simple index
  // Format: <a href="/simple/package-name/">package-name</a>
  const regex = /<a[^>]*>([^<]+)<\/a>/g
  let match

  while ((match = regex.exec(html)) !== null) {
    const name = match[1].trim()
    if (name) {
      packageNames.push(name)
    }
  }

  return packageNames
}

/**
 * Parse PyPI RSS feed for recent updates
 */
function parseRssFeed(xml: string, since: Date): string[] {
  const packages: string[] = []

  // Simple XML parsing for <item><title>package-name version</title><pubDate>...</pubDate></item>
  const itemRegex = /<item>[\s\S]*?<title>([^\s]+)\s+[\d.]+<\/title>[\s\S]*?<pubDate>([^<]+)<\/pubDate>[\s\S]*?<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const packageName = match[1]
    const pubDate = new Date(match[2])

    // Only include if published after last sync
    if (pubDate > since) {
      packages.push(packageName)
    }
  }

  return packages
}

async function getLastSyncTime(env: Env): Promise<string | null> {
  return await env.KV.get('pypi:last_sync')
}

async function saveLastSyncTime(env: Env, timestamp: string): Promise<void> {
  await env.KV.put('pypi:last_sync', timestamp)
}

async function createIngestionRun(env: Env, runType: string): Promise<number> {
  const result = await env.DB.prepare(`
    INSERT INTO ingestion_runs (source, run_type, started_at, status)
    VALUES ('pypi', ?, datetime('now'), 'running')
  `).bind(runType).run()

  return result.meta.last_row_id
}

async function completeIngestionRun(
  env: Env,
  runId: number,
  stats: { records_processed: number; records_inserted: number; records_failed: number }
): Promise<void> {
  await env.DB.prepare(`
    UPDATE ingestion_runs
    SET status = 'completed',
        completed_at = datetime('now'),
        duration_ms = (julianday(datetime('now')) - julianday(started_at)) * 86400000,
        records_processed = ?,
        records_inserted = ?,
        records_failed = ?
    WHERE id = ?
  `).bind(stats.records_processed, stats.records_inserted, stats.records_failed, runId).run()
}

async function failIngestionRun(env: Env, runId: number, errorMessage: string): Promise<void> {
  await env.DB.prepare(`
    UPDATE ingestion_runs
    SET status = 'failed',
        completed_at = datetime('now'),
        error_message = ?
    WHERE id = ?
  `).bind(errorMessage, runId).run()
}

async function trackMetrics(env: Env, event: string, data: any): Promise<void> {
  await env.ANALYTICS.writeDataPoint({
    blobs: [JSON.stringify(data)],
    indexes: ['pypi', event]
  })
}
