import type { R2Bucket } from '@cloudflare/workers-types'
import type { WhoisData, Email, DataSource } from '../types'
import { queryWhoisRecord, getDataFreshness } from '../lib/r2-query'

/**
 * WHOIS Data Source
 * Enriches companies using WHOIS domain registration data from R2
 */

export interface WhoisEnrichmentResult {
  whois: WhoisData | null
  emails: Email[]
  confidence: number
  data_sources: DataSource[]
  age_days: number
}

/**
 * Enrich company using domain
 */
export async function enrichCompanyByDomain(bucket: R2Bucket, domain: string): Promise<WhoisEnrichmentResult> {
  // Normalize domain
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '')

  // Query WHOIS record
  const record = await queryWhoisRecord(bucket, normalizedDomain)

  if (!record) {
    return {
      whois: null,
      emails: [],
      confidence: 0,
      data_sources: [],
      age_days: 999,
    }
  }

  // Calculate data freshness
  const tld = normalizedDomain.split('.').pop() || 'com'
  const whoisKey = `whois/${tld}/${normalizedDomain}.json`
  const ageDays = (await getDataFreshness(bucket, whoisKey)) || 999

  // Extract emails from WHOIS record
  const emails = extractWhoisEmails(record)

  // Build WhoisData
  const whoisData: WhoisData = {
    domain: record.domain,
    registrar: record.registrar || undefined,
    registered_date: record.registered_date || undefined,
    expiration_date: record.expiration_date || undefined,
    updated_date: record.updated_date || undefined,
    registrant_name: record.registrant_name || undefined,
    registrant_email: record.registrant_email || undefined,
    registrant_organization: record.registrant_organization || undefined,
    admin_email: record.admin_email || undefined,
    technical_email: record.technical_email || undefined,
    nameservers: record.nameservers || undefined,
    dnssec: record.dnssec || undefined,
    status: record.status || undefined,
  }

  // Calculate confidence score
  const confidence = calculateWhoisConfidence(whoisData, ageDays)

  return {
    whois: whoisData,
    emails,
    confidence,
    data_sources: ['whois'],
    age_days: ageDays,
  }
}

/**
 * Extract contact emails from WHOIS record
 */
function extractWhoisEmails(record: any): Email[] {
  const emails: Email[] = []

  // Add registrant email
  if (record.registrant_email && !isPrivacyEmail(record.registrant_email)) {
    emails.push({
      value: record.registrant_email.toLowerCase(),
      type: 'general',
      source: 'whois',
      confidence: 0.7,
      verified: false,
      last_seen: record.updated_date || new Date().toISOString(),
    })
  }

  // Add admin email
  if (record.admin_email && !isPrivacyEmail(record.admin_email) && !emails.find((e) => e.value === record.admin_email.toLowerCase())) {
    emails.push({
      value: record.admin_email.toLowerCase(),
      type: 'admin',
      source: 'whois',
      confidence: 0.75,
      verified: false,
      last_seen: record.updated_date || new Date().toISOString(),
    })
  }

  // Add technical email
  if (
    record.technical_email &&
    !isPrivacyEmail(record.technical_email) &&
    !emails.find((e) => e.value === record.technical_email.toLowerCase())
  ) {
    emails.push({
      value: record.technical_email.toLowerCase(),
      type: 'technical',
      source: 'whois',
      confidence: 0.7,
      verified: false,
      last_seen: record.updated_date || new Date().toISOString(),
    })
  }

  return emails
}

/**
 * Check if email is a privacy protection service
 */
function isPrivacyEmail(email: string): boolean {
  const privacyPatterns = [
    'whoisguard',
    'whoisprotect',
    'domainprivacy',
    'privateemail',
    'contactprivacy',
    'proxy',
    'privacy',
    'redacted',
    'anonymized',
  ]

  const lowerEmail = email.toLowerCase()
  return privacyPatterns.some((pattern) => lowerEmail.includes(pattern))
}

/**
 * Calculate confidence score for WHOIS data
 */
function calculateWhoisConfidence(whois: WhoisData, ageDays: number): number {
  let confidence = 0.65 // Base confidence for WHOIS data

  // Boost for complete information
  if (whois.registrant_name) {
    confidence += 0.05
  }
  if (whois.registrant_organization) {
    confidence += 0.05
  }
  if (whois.registrant_email && !isPrivacyEmail(whois.registrant_email)) {
    confidence += 0.1
  }

  // Penalize for privacy protection
  if (whois.registrant_name?.toLowerCase().includes('privacy') || whois.registrant_name?.toLowerCase().includes('redacted')) {
    confidence -= 0.2
  }

  // Penalize for stale data
  if (ageDays > 90) {
    confidence -= 0.1
  }
  if (ageDays > 180) {
    confidence -= 0.1
  }

  // Boost for recent update
  if (whois.updated_date) {
    const updatedAt = new Date(whois.updated_date)
    const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceUpdate < 30) {
      confidence += 0.05
    }
  }

  return Math.min(1.0, Math.max(0.0, confidence))
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
  // Basic domain validation regex
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i
  return domainRegex.test(domain)
}

/**
 * Extract domain from URL
 */
export function extractDomainFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname.replace(/^www\./, '').toLowerCase()
  } catch (error) {
    throw new Error('Invalid URL format')
  }
}
