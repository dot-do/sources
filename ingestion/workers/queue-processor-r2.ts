/**
 * Queue Consumer Worker - R2 Storage
 *
 * Processes messages from ingestion queue and writes to R2 in batched format.
 * Cloudflare Pipelines will automatically convert to Parquet.
 *
 * Data flow:
 * Queue → Batch Accumulator → R2 (NDJSON) → Pipelines → Parquet
 */

export interface Env {
  DB: D1Database // Minimal - only operational metadata
  DATA_BUCKET: R2Bucket // Primary storage
  KV: KVNamespace
  ANALYTICS: AnalyticsEngineDataset
  INGESTION_PIPELINE?: any // Cloudflare Pipeline binding
}

interface IngestMessage {
  source: 'npm' | 'pypi' | 'email' | 'org' | 'czds' | 'whois' | 'github'
  action: 'upsert' | 'delete'
  data: any
  timestamp: number
}

interface BatchAccumulator {
  source: string
  records: any[]
  first_timestamp: number
  last_timestamp: number
  bytes: number
}

// Batch settings
const MAX_BATCH_SIZE = 1000 // records
const MAX_BATCH_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_BATCH_AGE_MS = 60 * 1000 // 1 minute

// In-memory batch accumulator (per worker instance)
const batches = new Map<string, BatchAccumulator>()

// ============================================================================
// Main Worker
// ============================================================================

export default {
  /**
   * Queue message handler (batch processing)
   */
  async queue(batch: MessageBatch<IngestMessage>, env: Env): Promise<void> {
    console.log(`Processing batch of ${batch.messages.length} messages`)

    const ingestionId = generateIngestionId()

    // Track ingestion run in D1
    const runId = await createIngestionRun(env, {
      source: 'mixed',
      run_type: 'queue_processing',
      ingestion_id: ingestionId
    })

    try {
      // Group messages by source
      const bySource = new Map<string, IngestMessage[]>()

      for (const msg of batch.messages) {
        const source = msg.body.source
        if (!bySource.has(source)) {
          bySource.set(source, [])
        }
        bySource.get(source)!.push(msg.body)
      }

      // Process each source
      let totalProcessed = 0
      let totalFailed = 0

      for (const [source, messages] of bySource) {
        try {
          const result = await processSourceBatch(source, messages, ingestionId, env)
          totalProcessed += result.processed
          totalFailed += result.failed
        } catch (error) {
          console.error(`Failed to process ${source} batch:`, error)
          totalFailed += messages.length
        }
      }

      // Complete ingestion run
      await completeIngestionRun(env, runId, {
        records_processed: totalProcessed + totalFailed,
        records_inserted: totalProcessed,
        records_failed: totalFailed
      })

      console.log(`Batch complete: ${totalProcessed} processed, ${totalFailed} failed`)

    } catch (error) {
      console.error('Queue processing error:', error)
      await failIngestionRun(env, runId, error.message)
      throw error
    }
  }
}

// ============================================================================
// Process Batch by Source
// ============================================================================

async function processSourceBatch(
  source: string,
  messages: IngestMessage[],
  ingestionId: string,
  env: Env
): Promise<{ processed: number; failed: number }> {
  const records: any[] = []
  let failed = 0

  // Transform messages to normalized records
  for (const msg of messages) {
    try {
      const record = await normalizeRecord(source, msg, ingestionId)
      records.push(record)
    } catch (error) {
      console.error(`Failed to normalize ${source} record:`, error)
      failed++

      // Store failed message in D1
      await storeFailedMessage(msg, error, env)
    }
  }

  if (records.length === 0) {
    return { processed: 0, failed }
  }

  // Write to R2 in partitioned structure
  await writeToR2(source, records, env)

  // Update sync state in D1
  await updateSyncState(source, env)

  return { processed: records.length, failed }
}

// ============================================================================
// Normalize Records by Source
// ============================================================================

async function normalizeRecord(
  source: string,
  msg: IngestMessage,
  ingestionId: string
): Promise<any> {
  const baseRecord = {
    ingested_at: msg.timestamp,
    ingestion_id: ingestionId
  }

  switch (source) {
    case 'npm':
      return normalizeNpmPackage(msg.data, baseRecord)

    case 'pypi':
      return normalizePypiPackage(msg.data, baseRecord)

    case 'github':
      return normalizeGithubData(msg.data, baseRecord)

    case 'email':
      return normalizeEmailPattern(msg.data, baseRecord)

    case 'org':
      return normalizeOrganization(msg.data, baseRecord)

    case 'czds':
      return normalizeDomain(msg.data, baseRecord)

    case 'whois':
      return normalizeWhois(msg.data, baseRecord)

    default:
      throw new Error(`Unknown source: ${source}`)
  }
}

function normalizeNpmPackage(pkg: any, base: any) {
  const latestVersion = pkg['dist-tags']?.latest || pkg.version
  const latestVersionData = pkg.versions?.[latestVersion]

  return {
    ...base,
    name: pkg.name,
    version: latestVersion,
    description: pkg.description || null,
    author: pkg.author?.name || pkg.maintainers?.[0]?.name || null,
    license: pkg.license || null,
    homepage: pkg.homepage || null,
    repository: pkg.repository?.url || null,
    downloads_total: 0, // Need separate API call for downloads
    downloads_last_month: 0,
    downloads_last_week: 0,
    stars: 0, // From GitHub if linked
    forks: 0,
    published_at: pkg.time?.created || pkg.time?.[latestVersion] || null,
    last_updated: pkg.time?.modified || null,
    dependencies: latestVersionData?.dependencies || {},
    dev_dependencies: latestVersionData?.devDependencies || {},
    peer_dependencies: latestVersionData?.peerDependencies || {},
    keywords: pkg.keywords || [],
    data: pkg // Full package data
  }
}

function normalizePypiPackage(pkg: any, base: any) {
  const info = pkg.info || {}
  const latestVersion = info.version || ''
  const releases = pkg.releases?.[latestVersion] || []
  const uploadTime = releases[0]?.upload_time || null

  return {
    ...base,
    name: info.name,
    version: latestVersion,
    summary: info.summary || null,
    author: info.author || null,
    author_email: info.author_email || null,
    license: info.license || null,
    home_page: info.home_page || info.project_url || null,
    requires_dist: info.requires_dist || [],
    keywords: info.keywords || '',
    classifiers: info.classifiers || [],
    upload_time: uploadTime,
    size: releases[0]?.size || null,
    sha256: releases[0]?.digests?.sha256 || null,
    data: pkg
  }
}

function normalizeGithubData(data: any, base: any) {
  // GitHub data can be profile, repo, or commit
  if (data.type === 'profile') {
    return {
      ...base,
      id: data.id,
      login: data.login,
      name: data.name || null,
      email: data.email || null,
      company: data.company || null,
      blog: data.blog || null,
      location: data.location || null,
      bio: data.bio || null,
      public_repos: data.public_repos || 0,
      public_gists: data.public_gists || 0,
      followers: data.followers || 0,
      following: data.following || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
      data
    }
  } else if (data.type === 'repo') {
    return {
      ...base,
      id: data.id,
      full_name: data.full_name,
      name: data.name,
      owner_login: data.owner?.login,
      description: data.description || null,
      language: data.language || null,
      license: data.license?.spdx_id || null,
      homepage: data.homepage || null,
      stargazers_count: data.stargazers_count || 0,
      forks_count: data.forks_count || 0,
      watchers_count: data.watchers_count || 0,
      open_issues_count: data.open_issues_count || 0,
      size: data.size || 0,
      fork: data.fork || false,
      archived: data.archived || false,
      disabled: data.disabled || false,
      created_at: data.created_at,
      updated_at: data.updated_at,
      pushed_at: data.pushed_at,
      topics: data.topics || [],
      data
    }
  } else if (data.type === 'commit') {
    return {
      ...base,
      sha: data.sha,
      repo_full_name: data.repo_full_name,
      author_name: data.commit?.author?.name,
      author_email: data.commit?.author?.email,
      author_date: data.commit?.author?.date,
      committer_name: data.commit?.committer?.name,
      committer_email: data.commit?.committer?.email,
      committer_date: data.commit?.committer?.date,
      author_login: data.author?.login || null,
      author_id: data.author?.id || null,
      message: data.commit?.message,
      additions: data.stats?.additions || 0,
      deletions: data.stats?.deletions || 0,
      total_changes: data.stats?.total || 0,
      data
    }
  }

  return { ...base, data }
}

function normalizeEmailPattern(pattern: any, base: any) {
  return {
    ...base,
    domain: pattern.domain,
    pattern: pattern.pattern,
    confidence: pattern.confidence || 0,
    verified: pattern.verified || false,
    verified_at: pattern.verified_at || null,
    verified_by: pattern.verified_by || null,
    sources: pattern.sources || [],
    sample_emails: pattern.sample_emails || [],
    organization_id: pattern.organization_id || null,
    employee_count: pattern.employee_count || null,
    data: pattern
  }
}

function normalizeOrganization(org: any, base: any) {
  return {
    ...base,
    id: org.id || org.slug,
    name: org.name,
    legal_name: org.legal_name || null,
    domain: org.domain || null,
    type: org.type || null,
    industry: org.industry || null,
    employee_count: org.employee_count || null,
    revenue: org.revenue || null,
    founded_year: org.founded_year || null,
    country: org.country || null,
    state: org.state || null,
    city: org.city || null,
    lat: org.lat || null,
    lng: org.lng || null,
    website: org.website || null,
    linkedin_url: org.linkedin_url || null,
    twitter_handle: org.twitter_handle || null,
    github_org: org.github_org || null,
    org_chart: org.org_chart || null,
    people: org.people || null,
    data: org
  }
}

function normalizeDomain(domain: any, base: any) {
  return {
    ...base,
    domain: domain.domain,
    tld: domain.tld,
    nameservers: domain.nameservers || [],
    mx_records: domain.mx_records || [],
    a_records: domain.a_records || [],
    aaaa_records: domain.aaaa_records || [],
    txt_records: domain.txt_records || [],
    dnssec_enabled: domain.dnssec_enabled || false,
    ds_records: domain.ds_records || [],
    dnskey_records: domain.dnskey_records || [],
    registrar: domain.registrar || null,
    registrar_id: domain.registrar_id || null,
    created_date: domain.created_date || null,
    expiry_date: domain.expiry_date || null,
    last_updated: new Date().toISOString(),
    zone_file_r2_key: domain.zone_file_r2_key || null,
    zone_file_size: domain.zone_file_size || null,
    zone_file_hash: domain.zone_file_hash || null,
    data: domain
  }
}

function normalizeWhois(whois: any, base: any) {
  return {
    ...base,
    domain: whois.domain,
    registrant_name: whois.registrant_name || null,
    registrant_email: whois.registrant_email || null,
    registrant_organization: whois.registrant_organization || null,
    registrant_country: whois.registrant_country || null,
    registrar_name: whois.registrar_name || null,
    registrar_id: whois.registrar_id || null,
    registrar_url: whois.registrar_url || null,
    registrar_abuse_email: whois.registrar_abuse_email || null,
    registrar_abuse_phone: whois.registrar_abuse_phone || null,
    created_date: whois.created_date || null,
    updated_date: whois.updated_date || null,
    expiry_date: whois.expiry_date || null,
    nameservers: whois.nameservers || [],
    status_codes: whois.status_codes || [],
    dnssec: whois.dnssec || null,
    raw_whois: whois.raw_whois || null,
    data: whois,
    last_checked_at: new Date().toISOString()
  }
}

// ============================================================================
// Write to R2 (Partitioned by Date)
// ============================================================================

async function writeToR2(source: string, records: any[], env: Env): Promise<void> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  // Partition path
  const partitionPath = `${source}/year=${year}/month=${month}/day=${day}`

  // Generate batch file name
  const batchId = generateBatchId()
  const fileName = `${partitionPath}/batch_${batchId}.ndjson`

  // Convert records to newline-delimited JSON
  const ndjson = records.map(r => JSON.stringify(r)).join('\n')

  // Write to R2
  await env.DATA_BUCKET.put(fileName, ndjson, {
    httpMetadata: {
      contentType: 'application/x-ndjson'
    },
    customMetadata: {
      source,
      record_count: String(records.length),
      partition_key: `${year}-${month}-${day}`,
      ingestion_time: now.toISOString()
    }
  })

  console.log(`Wrote ${records.length} records to R2: ${fileName}`)

  // Track partition in D1 for indexing
  await trackPartition(env, {
    source,
    partition_key: `${year}-${month}-${day}`,
    r2_bucket: 'data-ingestion',
    r2_key: fileName,
    record_count: records.length,
    file_size_bytes: Buffer.byteLength(ndjson),
    time_start: now.toISOString(),
    time_end: now.toISOString()
  })
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateIngestionId(): string {
  return `ing_${Date.now()}_${Math.random().toString(36).substring(7)}`
}

function generateBatchId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(7)}`
}

async function createIngestionRun(
  env: Env,
  params: { source: string; run_type: string; ingestion_id: string }
): Promise<number> {
  const result = await env.DB.prepare(`
    INSERT INTO ingestion_runs (source, run_type, started_at, status, data)
    VALUES (?, ?, datetime('now'), 'running', ?)
  `).bind(params.source, params.run_type, JSON.stringify({ ingestion_id: params.ingestion_id })).run()

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

async function storeFailedMessage(msg: IngestMessage, error: any, env: Env): Promise<void> {
  try {
    await env.DB.prepare(`
      INSERT INTO failed_messages (
        queue_name, message_body, error_message, error_stack,
        retry_count, original_timestamp, failed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      'ingestion-queue',
      JSON.stringify(msg),
      error.message || String(error),
      error.stack || '',
      0,
      new Date(msg.timestamp).toISOString()
    ).run()
  } catch (storeError) {
    console.error('Failed to store failed message:', storeError)
  }
}

async function updateSyncState(source: string, env: Env): Promise<void> {
  const now = new Date().toISOString()

  await env.DB.prepare(`
    INSERT INTO sync_state (source, last_timestamp, last_sync_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (source) DO UPDATE SET
      last_timestamp = excluded.last_timestamp,
      last_sync_at = excluded.last_sync_at,
      updated_at = excluded.updated_at,
      total_records = total_records + 1
  `).bind(source, now, now, now).run()
}

async function trackPartition(env: Env, partition: any): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO r2_partitions (
      source, partition_key, r2_bucket, r2_key,
      record_count, file_size_bytes, time_start, time_end
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (source, partition_key) DO UPDATE SET
      record_count = record_count + excluded.record_count,
      file_size_bytes = file_size_bytes + excluded.file_size_bytes
  `).bind(
    partition.source,
    partition.partition_key,
    partition.r2_bucket,
    partition.r2_key,
    partition.record_count,
    partition.file_size_bytes,
    partition.time_start,
    partition.time_end
  ).run()
}
