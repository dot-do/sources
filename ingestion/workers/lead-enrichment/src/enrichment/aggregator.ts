import type { R2Bucket, D1Database } from '@cloudflare/workers-types'
import type { EnrichedPerson, EnrichedCompany, PersonEnrichmentRequest, CompanyEnrichmentRequest, SourceData } from '../types'
import { enrichPersonByGitHubUsername, enrichPersonByEmail } from './github-source'
import { enrichCompanyByDomain } from './whois-source'
import { calculateConfidenceScore, combineEmails, getPrimaryEmail } from './confidence'
import { getCachedPerson, getCachedCompany, cachePerson, cacheCompany, generateCacheKey } from '../lib/cache'
import { extractDomain } from '../lib/r2-query'

/**
 * Multi-Source Data Aggregator
 * Combines data from GitHub, WHOIS, and cache to produce enriched results
 */

/**
 * Enrich person from multiple sources
 */
export async function enrichPerson(bucket: R2Bucket, db: D1Database, request: PersonEnrichmentRequest): Promise<EnrichedPerson> {
  // Check cache first
  const cacheKey = generateCacheKey(request)
  const cached = await getCachedPerson(db, cacheKey)

  if (cached) {
    return cached
  }

  // Collect data from all available sources
  const sources: SourceData[] = []
  const allEmails: any[] = []
  let githubProfile = null
  let companyDomain: string | undefined

  // 1. Enrich from GitHub username
  if (request.github_username) {
    const githubResult = await enrichPersonByGitHubUsername(bucket, request.github_username)

    if (githubResult.profile) {
      githubProfile = githubResult.profile
      allEmails.push(...githubResult.emails)
      sources.push({
        source: 'github_profile',
        data: githubResult.profile,
        confidence: githubResult.confidence,
        age_days: githubResult.age_days,
        weight: 1.0,
      })
    }

    // Extract company domain from GitHub profile
    if (githubProfile?.company) {
      const companyMatch = githubProfile.company.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
      if (companyMatch) {
        companyDomain = companyMatch[1]
      }
    }
  }

  // 2. Enrich from email
  if (request.email) {
    const githubResult = await enrichPersonByEmail(bucket, request.email)

    if (githubResult.profile && !githubProfile) {
      githubProfile = githubResult.profile
    }

    if (githubResult.emails.length > 0) {
      allEmails.push(...githubResult.emails)
      sources.push({
        source: 'github_commits',
        data: { emails: githubResult.emails },
        confidence: githubResult.confidence,
        age_days: githubResult.age_days,
        weight: 0.9,
      })
    }

    // Extract domain from email
    if (request.email && !companyDomain) {
      companyDomain = extractDomain(request.email)
    }
  }

  // 3. Use provided domain
  if (request.domain) {
    companyDomain = request.domain
  }

  // Combine emails and remove duplicates
  const combinedEmails = combineEmails(allEmails)
  const primaryEmail = getPrimaryEmail(combinedEmails) || request.email

  // Calculate final confidence score
  const confidenceScore = calculateConfidenceScore(sources)

  // Build enriched person
  const enrichedPerson: EnrichedPerson = {
    name: githubProfile?.name,
    email: primaryEmail,
    emails: combinedEmails.length > 0 ? combinedEmails : undefined,
    github: githubProfile || undefined,
    company: companyDomain
      ? {
          domain: companyDomain,
          name: githubProfile?.company || undefined,
          confidence: 0.7,
        }
      : undefined,
    social: {
      website: githubProfile?.blog || undefined,
      // linkedin_url would come from request
      linkedin: request.linkedin_url || undefined,
    },
    location: githubProfile?.location
      ? {
          city: extractCity(githubProfile.location),
          state: extractState(githubProfile.location),
          country: extractCountry(githubProfile.location),
        }
      : undefined,
    confidence_score: confidenceScore.final,
    data_sources: sources.map((s) => s.source),
    last_updated: new Date().toISOString(),
  }

  // Cache the result
  await cachePerson(db, cacheKey, enrichedPerson)

  return enrichedPerson
}

/**
 * Enrich company from multiple sources
 */
export async function enrichCompany(bucket: R2Bucket, db: D1Database, request: CompanyEnrichmentRequest): Promise<EnrichedCompany> {
  // Determine domain
  let domain: string

  if (request.domain) {
    domain = request.domain.toLowerCase().replace(/^www\./, '')
  } else if (request.website) {
    const url = new URL(request.website)
    domain = url.hostname.replace(/^www\./, '')
  } else if (request.name) {
    // Try to infer domain from company name (basic heuristic)
    domain = request.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
  } else {
    throw new Error('At least one of domain, website, or name is required')
  }

  // Check cache first
  const cacheKey = `domain:${domain}`
  const cached = await getCachedCompany(db, cacheKey)

  if (cached) {
    return cached
  }

  // Collect data from all available sources
  const sources: SourceData[] = []

  // 1. Enrich from WHOIS
  const whoisResult = await enrichCompanyByDomain(bucket, domain)

  if (whoisResult.whois) {
    sources.push({
      source: 'whois',
      data: whoisResult.whois,
      confidence: whoisResult.confidence,
      age_days: whoisResult.age_days,
      weight: 0.7,
    })
  }

  // 2. Enrich from GitHub organization
  const githubOrgResult = await enrichCompanyByDomain(bucket, domain)

  if (githubOrgResult.organization) {
    sources.push({
      source: 'github_org',
      data: githubOrgResult.organization,
      confidence: githubOrgResult.confidence,
      age_days: 30, // Assume 30 days for org data
      weight: 0.8,
    })
  }

  // Calculate final confidence score
  const confidenceScore = calculateConfidenceScore(sources)

  // Combine emails from all sources
  const allEmails = [...(whoisResult.emails || [])]
  const combinedEmails = combineEmails(allEmails)

  // Build enriched company
  const enrichedCompany: EnrichedCompany = {
    name: request.name || whoisResult.whois?.registrant_organization || undefined,
    legal_name: whoisResult.whois?.registrant_organization || undefined,
    domain,
    website: request.website || `https://${domain}`,
    description: githubOrgResult.organization?.description || undefined,
    location: whoisResult.whois?.registrant_name
      ? {
          country: extractCountryFromWhois(whoisResult.whois),
        }
      : undefined,
    contact: {
      emails: combinedEmails.length > 0 ? combinedEmails : undefined,
    },
    technology_stack: {
      detected: false,
      message: 'Technology detection not yet implemented',
    },
    github: githubOrgResult.organization || undefined,
    whois: whoisResult.whois || undefined,
    confidence_score: confidenceScore.final,
    data_sources: sources.map((s) => s.source),
    last_updated: new Date().toISOString(),
  }

  // Cache the result
  await cacheCompany(db, cacheKey, enrichedCompany)

  return enrichedCompany
}

/**
 * Helper functions for location parsing
 */

function extractCity(location: string): string | undefined {
  // Basic heuristic: first part before comma
  const parts = location.split(',')
  return parts.length > 0 ? parts[0].trim() : undefined
}

function extractState(location: string): string | undefined {
  // Basic heuristic: second part if exists
  const parts = location.split(',')
  return parts.length > 1 ? parts[1].trim() : undefined
}

function extractCountry(location: string): string | undefined {
  // Basic heuristic: last part or single value
  const parts = location.split(',')
  return parts.length > 0 ? parts[parts.length - 1].trim() : undefined
}

function extractCountryFromWhois(whois: any): string | undefined {
  // Try to extract country from registrant data
  return whois.registrant_country || undefined
}
