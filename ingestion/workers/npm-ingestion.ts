/**
 * NPM Package Ingestion Worker
 *
 * Syncs package data from NPM registry using:
 * 1. Full sync: _all_docs endpoint (initial load)
 * 2. Incremental sync: _changes feed (continuous updates)
 *
 * Data flow:
 * NPM Registry → This Worker → Queue → Processor → D1/R2
 */

export interface Env {
  DB: D1Database
  RAW_BUCKET: R2Bucket
  KV: KVNamespace
  INGESTION_QUEUE: Queue
  ANALYTICS: AnalyticsEngineDataset

  // Secrets
  NPM_REGISTRY_URL?: string
}

interface NpmPackage {
  _id: string
  _rev: string
  name: string
  'dist-tags': { latest: string }
  description?: string
  author?: { name: string; email: string }
  license?: string
  homepage?: string
  repository?: { type: string; url: string }
  keywords?: string[]
  time?: { created: string; modified: string; [version: string]: string }
  versions?: Record<string, any>
}

interface IngestMessage {
  source: 'npm'
  action: 'upsert' | 'delete'
  data: NpmPackage
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
        const since = url.searchParams.get('since') || await getLastSequence(env)
        return await handleIncrementalSync(since, env)
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
        service: 'npm-ingestion',
        endpoints: {
          '/sync/full': 'Full sync of all packages',
          '/sync/incremental?since=<seq>': 'Incremental sync from sequence',
          '/sync/package?name=<name>': 'Sync single package',
          '/status': 'Ingestion status'
        }
      })

    } catch (error) {
      console.error('NPM ingestion error:', error)
      return Response.json({
        error: error.message
      }, { status: 500 })
    }
  },

  /**
   * Scheduled trigger (runs daily)
   */
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log('Starting scheduled NPM sync')

    try {
      // Get last sequence
      const lastSeq = await getLastSequence(env)

      // Run incremental sync
      const result = await runIncrementalSync(lastSeq, env)

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
  const registryUrl = env.NPM_REGISTRY_URL || 'https://replicate.npmjs.com'

  // Track ingestion run
  const runId = await createIngestionRun(env, 'full_sync')

  try {
    console.log('Starting full NPM sync from', registryUrl)

    // Fetch all package names
    const response = await fetch(`${registryUrl}/_all_docs`)

    if (!response.ok) {
      throw new Error(`Registry returned ${response.status}`)
    }

    const data = await response.json<{ total_rows: number; rows: Array<{ id: string }> }>()
    console.log(`Found ${data.total_rows} packages`)

    let queued = 0
    let failed = 0

    // Queue packages in batches
    const batchSize = 100
    for (let i = 0; i < data.rows.length; i += batchSize) {
      const batch = data.rows.slice(i, i + batchSize)

      // Queue each package for detailed fetch
      const promises = batch.map(async (row) => {
        try {
          await env.INGESTION_QUEUE.send({
            source: 'npm',
            action: 'upsert',
            data: { _id: row.id, name: row.id } as NpmPackage,
            timestamp: Date.now()
          } as IngestMessage)
          queued++
        } catch (error) {
          console.error(`Failed to queue ${row.id}:`, error)
          failed++
        }
      })

      await Promise.all(promises)

      // Progress logging
      if ((i + batchSize) % 1000 === 0) {
        console.log(`Queued ${i + batchSize}/${data.total_rows} packages`)
      }
    }

    // Update ingestion run
    await completeIngestionRun(env, runId, {
      records_processed: data.total_rows,
      records_inserted: queued,
      records_failed: failed
    })

    return Response.json({
      status: 'completed',
      total: data.total_rows,
      queued,
      failed
    })

  } catch (error) {
    await failIngestionRun(env, runId, error.message)
    throw error
  }
}

// ============================================================================
// Incremental Sync (Continuous Updates)
// ============================================================================

async function handleIncrementalSync(since: string, env: Env): Promise<Response> {
  const result = await runIncrementalSync(since, env)
  return Response.json(result)
}

async function runIncrementalSync(since: string, env: Env) {
  const registryUrl = env.NPM_REGISTRY_URL || 'https://replicate.npmjs.com'

  const runId = await createIngestionRun(env, 'incremental')

  try {
    console.log(`Starting incremental sync from sequence: ${since}`)

    // Fetch changes since last sequence
    const response = await fetch(`${registryUrl}/_changes?since=${since}&limit=1000&include_docs=true`)

    if (!response.ok) {
      throw new Error(`Registry returned ${response.status}`)
    }

    const data = await response.json<{
      results: Array<{ id: string; seq: number; deleted?: boolean; doc?: NpmPackage }>
      last_seq: string
    }>()

    console.log(`Processing ${data.results.length} changes`)

    let queued = 0
    let failed = 0

    // Queue changes
    for (const change of data.results) {
      try {
        await env.INGESTION_QUEUE.send({
          source: 'npm',
          action: change.deleted ? 'delete' : 'upsert',
          data: change.doc || { _id: change.id, name: change.id } as NpmPackage,
          timestamp: Date.now()
        } as IngestMessage)
        queued++
      } catch (error) {
        console.error(`Failed to queue ${change.id}:`, error)
        failed++
      }
    }

    // Save last sequence
    await saveLastSequence(env, data.last_seq)

    // Update ingestion run
    await completeIngestionRun(env, runId, {
      records_processed: data.results.length,
      records_inserted: queued,
      records_failed: failed
    })

    return {
      status: 'completed',
      changes: data.results.length,
      queued,
      failed,
      last_seq: data.last_seq
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
  const registryUrl = env.NPM_REGISTRY_URL || 'https://replicate.npmjs.com'

  try {
    console.log(`Fetching package: ${packageName}`)

    // Fetch package metadata
    const response = await fetch(`${registryUrl}/${encodeURIComponent(packageName)}`)

    if (!response.ok) {
      if (response.status === 404) {
        return Response.json({ error: 'Package not found' }, { status: 404 })
      }
      throw new Error(`Registry returned ${response.status}`)
    }

    const packageData = await response.json<NpmPackage>()

    // Queue for processing
    await env.INGESTION_QUEUE.send({
      source: 'npm',
      action: 'upsert',
      data: packageData,
      timestamp: Date.now()
    } as IngestMessage)

    return Response.json({
      status: 'queued',
      package: packageName,
      version: packageData['dist-tags']?.latest
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
    // Get last sequence
    const lastSeq = await getLastSequence(env)

    // Get recent ingestion runs
    const runs = await env.DB.prepare(`
      SELECT * FROM ingestion_runs
      WHERE source = 'npm'
      ORDER BY started_at DESC
      LIMIT 10
    `).all()

    // Get package count
    const count = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM packages WHERE ns = 'npm'
    `).first<{ count: number }>()

    return Response.json({
      service: 'npm-ingestion',
      last_sequence: lastSeq,
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

async function getLastSequence(env: Env): Promise<string> {
  const seq = await env.KV.get('npm:last_sequence')
  return seq || '0'
}

async function saveLastSequence(env: Env, sequence: string): Promise<void> {
  await env.KV.put('npm:last_sequence', sequence)
}

async function createIngestionRun(env: Env, runType: string): Promise<number> {
  const result = await env.DB.prepare(`
    INSERT INTO ingestion_runs (source, run_type, started_at, status)
    VALUES ('npm', ?, datetime('now'), 'running')
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
    indexes: ['npm', event]
  })
}
