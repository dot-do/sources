/**
 * Queue Consumer Worker
 *
 * Processes messages from ingestion queue and writes to R2 (via Pipelines/Streams):
 * - NPM packages → R2 (JSON + Parquet)
 * - PyPI packages → R2 (JSON + Parquet)
 * - Email patterns → R2 (JSON + Parquet)
 * - Organizations → R2 (JSON + Parquet)
 * - GitHub data → R2 (JSON + Parquet)
 * - Zone files → R2 (raw zone files + metadata)
 * - WHOIS records → R2 (JSON + Parquet)
 *
 * Data flow:
 * Queue → This Worker → Pipelines → Streams → R2 → Data Catalog → R2 SQL
 *
 * Storage Strategy:
 * - R2: Primary storage (unlimited scale)
 * - D1: Only operational metadata (ingestion runs, sync state)
 */

export interface Env {
  DB: D1Database  // Only for operational metadata
  DATA_BUCKET: R2Bucket  // Primary data storage (Parquet + JSON)
  RAW_BUCKET: R2Bucket  // Raw source dumps
  ZONE_BUCKET: R2Bucket  // DNS zone files
  KV: KVNamespace
  ANALYTICS: AnalyticsEngineDataset

  // Cloudflare Pipelines (when available)
  PIPELINE?: any
}

interface IngestMessage {
  source: 'npm' | 'pypi' | 'email' | 'org' | 'github' | 'czds' | 'whois'
  action: 'upsert' | 'delete'
  data: any
  timestamp: number
}

// ============================================================================
// Queue Consumer
// ============================================================================

export default {
  /**
   * Queue message handler (batch processing)
   */
  async queue(batch: MessageBatch<IngestMessage>, env: Env): Promise<void> {
    console.log(`Processing batch of ${batch.messages.length} messages`)

    const results = await Promise.allSettled(
      batch.messages.map(msg => processMessage(msg, env))
    )

    // Track metrics
    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`Batch complete: ${succeeded} succeeded, ${failed} failed`)

    // Log failures
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`Message ${i} failed:`, result.reason)
      }
    })

    // Track analytics
    await env.ANALYTICS.writeDataPoint({
      blobs: [JSON.stringify({ succeeded, failed })],
      indexes: ['queue_processing', 'batch']
    })
  }
}

// ============================================================================
// Message Processing Router
// ============================================================================

async function processMessage(
  message: Message<IngestMessage>,
  env: Env
): Promise<void> {
  const { source, action, data } = message.body

  try {
    // Route to appropriate processor
    switch (source) {
      case 'npm':
        await processNpmPackage(data, action, env)
        break

      case 'pypi':
        await processPypiPackage(data, action, env)
        break

      case 'email':
        await processEmailPattern(data, action, env)
        break

      case 'org':
        await processOrganization(data, action, env)
        break

      case 'github':
        await processGitHubData(data, action, env)
        break

      case 'czds':
        await processZoneFile(data, action, env)
        break

      case 'whois':
        await processWhoisRecord(data, action, env)
        break

      default:
        throw new Error(`Unknown source: ${source}`)
    }

    // Acknowledge success
    message.ack()

  } catch (error) {
    console.error(`Failed to process ${source} message:`, error)

    // Retry with exponential backoff (handled by queue config)
    message.retry()

    // Store in failed_messages table for investigation
    await storeFailed(message.body, error, env)
  }
}

// ============================================================================
// NPM Package Processor - R2 Storage
// ============================================================================

async function processNpmPackage(
  pkg: any,
  action: 'upsert' | 'delete',
  env: Env
): Promise<void> {
  const packageName = pkg.name

  if (action === 'delete') {
    // Delete from R2 (mark as deleted in metadata)
    const deletionMarker = {
      name: packageName,
      deleted: true,
      deleted_at: new Date().toISOString()
    }
    await writeToR2(env.DATA_BUCKET, 'npm/metadata', packageName, deletionMarker)
    return
  }

  // Extract structured fields for Parquet
  const latestVersion = pkg['dist-tags']?.latest || pkg.version
  const metadata = {
    name: packageName,
    version: latestVersion,
    description: pkg.description || '',
    author: pkg.author?.name || pkg.maintainers?.[0]?.name || '',
    license: pkg.license || '',
    homepage: pkg.homepage || '',
    repository: pkg.repository?.url || '',

    downloads_total: 0,  // To be enriched from npm stats API
    downloads_last_month: 0,
    stars: 0,  // From GitHub if repo linked
    forks: 0,

    published_at: pkg.time?.created || pkg.time?.[latestVersion] || '',
    last_updated: pkg.time?.modified || '',

    keywords: pkg.keywords?.join(',') || '',
    tags: '',

    dependencies: JSON.stringify(pkg.versions?.[latestVersion]?.dependencies || {}),
    dev_dependencies: JSON.stringify(pkg.versions?.[latestVersion]?.devDependencies || {}),
    peer_dependencies: JSON.stringify(pkg.versions?.[latestVersion]?.peerDependencies || {}),

    data: JSON.stringify(pkg),  // Full package data

    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Write metadata to R2 (structured for Parquet)
  await writeToR2(env.DATA_BUCKET, 'npm/metadata', packageName, metadata)

  // Store raw package data in R2
  await env.RAW_BUCKET.put(
    `npm/raw/${packageName}.json`,
    JSON.stringify(pkg, null, 2),
    {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        'source': 'npm',
        'version': latestVersion,
        'updated_at': new Date().toISOString()
      }
    }
  )

  console.log(`Processed NPM package: ${packageName}`)
}

// ============================================================================
// PyPI Package Processor
// ============================================================================

async function processPypiPackage(
  pkg: any,
  action: 'upsert' | 'delete',
  env: Env
): Promise<void> {
  if (action === 'delete') {
    await env.DB.prepare(`
      DELETE FROM packages WHERE ns = 'pypi' AND id = ?
    `).bind(pkg.info?.name).run()
    return
  }

  const info = pkg.info || {}
  const latestVersion = info.version || ''

  // Extract structured fields
  const description = info.summary || ''
  const author = info.author || ''
  const license = info.license || ''
  const homepage = info.home_page || info.project_url || ''
  const repository = info.project_urls?.Repository || info.project_urls?.Source || ''

  // Extract dependencies (requires_dist)
  const dependencies = JSON.stringify(info.requires_dist || [])

  // Keywords
  const keywords = info.keywords || ''

  // Dates (from releases)
  const releases = pkg.releases?.[latestVersion] || []
  const publishedAt = releases[0]?.upload_time || ''

  // Store full package data as JSON
  const data = JSON.stringify(pkg)

  // Upsert to D1
  await env.DB.prepare(`
    INSERT INTO packages (
      ns, id, name, version, description, author, license, homepage, repository,
      dependencies, keywords, published_at, last_updated, data, updated_at
    )
    VALUES (
      'pypi', ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, datetime('now')
    )
    ON CONFLICT (ns, id) DO UPDATE SET
      version = excluded.version,
      description = excluded.description,
      author = excluded.author,
      license = excluded.license,
      homepage = excluded.homepage,
      repository = excluded.repository,
      dependencies = excluded.dependencies,
      keywords = excluded.keywords,
      last_updated = excluded.last_updated,
      data = excluded.data,
      updated_at = datetime('now')
  `).bind(
    info.name,
    info.name,
    latestVersion,
    description,
    author,
    license,
    homepage,
    repository,
    dependencies,
    keywords,
    publishedAt,
    new Date().toISOString(),
    data
  ).run()

  // Store raw package data in R2
  await env.RAW_BUCKET.put(
    `pypi/${info.name}.json`,
    JSON.stringify(pkg, null, 2),
    {
      httpMetadata: { contentType: 'application/json' }
    }
  )

  console.log(`Processed PyPI package: ${info.name}`)
}

// ============================================================================
// Email Pattern Processor
// ============================================================================

async function processEmailPattern(
  pattern: any,
  action: 'upsert' | 'delete',
  env: Env
): Promise<void> {
  if (action === 'delete') {
    await env.DB.prepare(`
      DELETE FROM email_patterns WHERE ns = 'email' AND id = ?
    `).bind(pattern.domain).run()
    return
  }

  // Extract fields
  const domain = pattern.domain
  const patternStr = pattern.pattern || ''
  const verified = pattern.verified ? 1 : 0
  const verifiedAt = pattern.verified_at || null
  const verifiedBy = pattern.verified_by || ''
  const confidence = pattern.confidence || 0

  // Sources (comma-separated)
  const sources = Array.isArray(pattern.sources)
    ? pattern.sources.join(',')
    : pattern.sources || ''

  // Sample emails
  const sampleEmails = JSON.stringify(pattern.sample_emails || [])

  // Organization link
  const organizationId = pattern.organization_id || null
  const employeeCount = pattern.employee_count || null

  // Store full data
  const data = JSON.stringify(pattern)

  // Upsert to D1
  await env.DB.prepare(`
    INSERT INTO email_patterns (
      ns, id, domain, pattern, verified, verified_at, verified_by, confidence,
      sources, sample_emails, organization_id, employee_count, data, updated_at
    )
    VALUES (
      'email', ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, datetime('now')
    )
    ON CONFLICT (ns, id) DO UPDATE SET
      pattern = excluded.pattern,
      verified = excluded.verified,
      verified_at = excluded.verified_at,
      verified_by = excluded.verified_by,
      confidence = excluded.confidence,
      sources = excluded.sources,
      sample_emails = excluded.sample_emails,
      organization_id = excluded.organization_id,
      employee_count = excluded.employee_count,
      data = excluded.data,
      updated_at = datetime('now')
  `).bind(
    domain,
    domain,
    patternStr,
    verified,
    verifiedAt,
    verifiedBy,
    confidence,
    sources,
    sampleEmails,
    organizationId,
    employeeCount,
    data
  ).run()

  console.log(`Processed email pattern: ${domain}`)
}

// ============================================================================
// Organization Processor
// ============================================================================

async function processOrganization(
  org: any,
  action: 'upsert' | 'delete',
  env: Env
): Promise<void> {
  if (action === 'delete') {
    await env.DB.prepare(`
      DELETE FROM organizations WHERE ns = 'org' AND id = ?
    `).bind(org.id).run()
    return
  }

  // Extract fields
  const id = org.id || org.slug || ''
  const name = org.name || ''
  const legalName = org.legal_name || ''
  const domain = org.domain || ''
  const type = org.type || ''
  const industry = org.industry || ''

  // Size and metrics
  const employeeCount = org.employee_count || null
  const revenue = org.revenue || null
  const foundedYear = org.founded_year || null

  // Location
  const country = org.country || ''
  const state = org.state || ''
  const city = org.city || ''
  const address = org.address || ''
  const lat = org.lat || null
  const lng = org.lng || null

  // Social
  const website = org.website || ''
  const linkedinUrl = org.linkedin_url || ''
  const twitterHandle = org.twitter_handle || ''
  const githubOrg = org.github_org || ''

  // Org chart (from TheOrg)
  const orgChart = JSON.stringify(org.org_chart || {})

  // People
  const people = JSON.stringify(org.people || [])

  // Full data
  const data = JSON.stringify(org)

  // Upsert to D1
  await env.DB.prepare(`
    INSERT INTO organizations (
      ns, id, name, legal_name, domain, type, industry,
      employee_count, revenue, founded_year,
      country, state, city, address, lat, lng,
      website, linkedin_url, twitter_handle, github_org,
      org_chart, people, data, updated_at
    )
    VALUES (
      'org', ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, datetime('now')
    )
    ON CONFLICT (ns, id) DO UPDATE SET
      name = excluded.name,
      legal_name = excluded.legal_name,
      domain = excluded.domain,
      type = excluded.type,
      industry = excluded.industry,
      employee_count = excluded.employee_count,
      revenue = excluded.revenue,
      founded_year = excluded.founded_year,
      country = excluded.country,
      state = excluded.state,
      city = excluded.city,
      address = excluded.address,
      lat = excluded.lat,
      lng = excluded.lng,
      website = excluded.website,
      linkedin_url = excluded.linkedin_url,
      twitter_handle = excluded.twitter_handle,
      github_org = excluded.github_org,
      org_chart = excluded.org_chart,
      people = excluded.people,
      data = excluded.data,
      updated_at = datetime('now')
  `).bind(
    id, name, legalName, domain, type, industry,
    employeeCount, revenue, foundedYear,
    country, state, city, address, lat, lng,
    website, linkedinUrl, twitterHandle, githubOrg,
    orgChart, people, data
  ).run()

  console.log(`Processed organization: ${name}`)
}

// ============================================================================
// Zone File Processor
// ============================================================================

async function processZoneFile(
  zone: any,
  action: 'upsert' | 'delete',
  env: Env
): Promise<void> {
  if (action === 'delete') {
    await env.DB.prepare(`
      DELETE FROM domains WHERE ns = 'domain' AND id = ?
    `).bind(zone.domain).run()
    return
  }

  // Store zone file in R2
  const r2Key = `zones/${zone.tld}/${zone.domain}.zone`
  await env.ZONE_BUCKET.put(r2Key, zone.zone_file_content)

  // Extract structured DNS records
  const nameservers = JSON.stringify(zone.nameservers || [])
  const mxRecords = JSON.stringify(zone.mx_records || [])
  const aRecords = JSON.stringify(zone.a_records || [])
  const aaaaRecords = JSON.stringify(zone.aaaa_records || [])
  const txtRecords = JSON.stringify(zone.txt_records || [])

  // DNSSEC
  const dnssecEnabled = zone.dnssec_enabled ? 1 : 0
  const dsRecords = JSON.stringify(zone.ds_records || [])
  const dnskeyRecords = JSON.stringify(zone.dnskey_records || [])

  // Registrar
  const registrar = zone.registrar || ''
  const registrarId = zone.registrar_id || ''

  // Dates
  const createdDate = zone.created_date || null
  const expiryDate = zone.expiry_date || null
  const lastUpdated = new Date().toISOString()

  // R2 metadata
  const zoneFileSize = zone.zone_file_content?.length || 0
  const zoneFileHash = zone.zone_file_hash || ''

  // Full data
  const data = JSON.stringify({
    ...zone,
    zone_file_content: undefined // Don't duplicate large content
  })

  // Upsert to D1
  await env.DB.prepare(`
    INSERT INTO domains (
      ns, id, tld,
      nameservers, mx_records, a_records, aaaa_records, txt_records,
      dnssec_enabled, ds_records, dnskey_records,
      registrar, registrar_id,
      created_date, expiry_date, last_updated,
      zone_file_r2_key, zone_file_size, zone_file_hash,
      data, updated_at
    )
    VALUES (
      'domain', ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, datetime('now')
    )
    ON CONFLICT (ns, id) DO UPDATE SET
      nameservers = excluded.nameservers,
      mx_records = excluded.mx_records,
      a_records = excluded.a_records,
      aaaa_records = excluded.aaaa_records,
      txt_records = excluded.txt_records,
      dnssec_enabled = excluded.dnssec_enabled,
      ds_records = excluded.ds_records,
      dnskey_records = excluded.dnskey_records,
      last_updated = excluded.last_updated,
      zone_file_r2_key = excluded.zone_file_r2_key,
      zone_file_size = excluded.zone_file_size,
      zone_file_hash = excluded.zone_file_hash,
      data = excluded.data,
      updated_at = datetime('now')
  `).bind(
    zone.domain, zone.tld,
    nameservers, mxRecords, aRecords, aaaaRecords, txtRecords,
    dnssecEnabled, dsRecords, dnskeyRecords,
    registrar, registrarId,
    createdDate, expiryDate, lastUpdated,
    r2Key, zoneFileSize, zoneFileHash,
    data
  ).run()

  console.log(`Processed zone file: ${zone.domain}`)
}

// ============================================================================
// WHOIS Record Processor
// ============================================================================

async function processWhoisRecord(
  whois: any,
  action: 'upsert' | 'delete',
  env: Env
): Promise<void> {
  if (action === 'delete') {
    await env.DB.prepare(`
      DELETE FROM whois_records WHERE ns = 'whois' AND id = ?
    `).bind(whois.domain).run()
    return
  }

  // Registrant (often redacted)
  const registrantName = whois.registrant_name || null
  const registrantEmail = whois.registrant_email || null
  const registrantOrganization = whois.registrant_organization || null
  const registrantCountry = whois.registrant_country || null
  const registrantState = whois.registrant_state || null
  const registrantCity = whois.registrant_city || null

  // Registrar
  const registrarName = whois.registrar_name || ''
  const registrarId = whois.registrar_id || ''
  const registrarUrl = whois.registrar_url || ''
  const registrarAbuseEmail = whois.registrar_abuse_email || ''
  const registrarAbusePhone = whois.registrar_abuse_phone || ''

  // Dates
  const createdDate = whois.created_date || null
  const updatedDate = whois.updated_date || null
  const expiryDate = whois.expiry_date || null

  // Nameservers (comma-separated)
  const nameservers = Array.isArray(whois.nameservers)
    ? whois.nameservers.join(',')
    : whois.nameservers || ''

  // Status codes (comma-separated)
  const statusCodes = Array.isArray(whois.status_codes)
    ? whois.status_codes.join(',')
    : whois.status_codes || ''

  // DNSSEC
  const dnssec = whois.dnssec || ''

  // Raw WHOIS text
  const rawWhois = whois.raw_whois || ''

  // Full data
  const data = JSON.stringify(whois)

  // Last checked timestamp
  const lastCheckedAt = new Date().toISOString()

  // Upsert to D1
  await env.DB.prepare(`
    INSERT INTO whois_records (
      ns, id,
      registrant_name, registrant_email, registrant_organization,
      registrant_country, registrant_state, registrant_city,
      registrar_name, registrar_id, registrar_url,
      registrar_abuse_email, registrar_abuse_phone,
      created_date, updated_date, expiry_date,
      nameservers, status_codes, dnssec,
      raw_whois, data, last_checked_at, updated_at
    )
    VALUES (
      'whois', ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, datetime('now')
    )
    ON CONFLICT (ns, id) DO UPDATE SET
      registrant_name = excluded.registrant_name,
      registrant_email = excluded.registrant_email,
      registrant_organization = excluded.registrant_organization,
      registrant_country = excluded.registrant_country,
      registrant_state = excluded.registrant_state,
      registrant_city = excluded.registrant_city,
      registrar_name = excluded.registrar_name,
      registrar_id = excluded.registrar_id,
      registrar_url = excluded.registrar_url,
      registrar_abuse_email = excluded.registrar_abuse_email,
      registrar_abuse_phone = excluded.registrar_abuse_phone,
      created_date = excluded.created_date,
      updated_date = excluded.updated_date,
      expiry_date = excluded.expiry_date,
      nameservers = excluded.nameservers,
      status_codes = excluded.status_codes,
      dnssec = excluded.dnssec,
      raw_whois = excluded.raw_whois,
      data = excluded.data,
      last_checked_at = excluded.last_checked_at,
      updated_at = datetime('now')
  `).bind(
    whois.domain,
    registrantName, registrantEmail, registrantOrganization,
    registrantCountry, registrantState, registrantCity,
    registrarName, registrarId, registrarUrl,
    registrarAbuseEmail, registrarAbusePhone,
    createdDate, updatedDate, expiryDate,
    nameservers, statusCodes, dnssec,
    rawWhois, data, lastCheckedAt
  ).run()

  console.log(`Processed WHOIS record: ${whois.domain}`)
}

// ============================================================================
// Error Handler
// ============================================================================

async function storeFailed(
  messageBody: IngestMessage,
  error: any,
  env: Env
): Promise<void> {
  try {
    await env.DB.prepare(`
      INSERT INTO failed_messages (
        queue_name, message_body, error_message, error_stack,
        retry_count, original_timestamp, failed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      'ingestion-queue',
      JSON.stringify(messageBody),
      error.message || String(error),
      error.stack || '',
      0,
      new Date(messageBody.timestamp).toISOString()
    ).run()
  } catch (storeError) {
    console.error('Failed to store failed message:', storeError)
  }
}
