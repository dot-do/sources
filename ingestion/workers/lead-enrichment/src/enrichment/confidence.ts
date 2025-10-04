import type { DataSource, ConfidenceScore, SourceData } from '../types'

/**
 * Confidence Scoring Algorithm
 * Calculates confidence scores for enriched data based on multiple factors
 */

/**
 * Data source reliability weights
 */
const SOURCE_WEIGHTS: Record<DataSource, number> = {
  github_profile: 1.0, // Highest reliability - verified profile
  github_commits: 0.9, // High reliability - actual activity
  github_repos: 0.85, // High reliability - public data
  github_org: 0.8, // Good reliability - organization data
  whois: 0.7, // Medium reliability - may have privacy protection
  website: 0.75, // Good reliability - self-published
  linkedin: 0.9, // High reliability - professional network
  cache: 0.95, // Very high - previously validated
}

/**
 * Calculate final confidence score
 */
export function calculateConfidenceScore(sources: SourceData[]): ConfidenceScore {
  if (sources.length === 0) {
    return {
      base: 0,
      source_weight: 0,
      freshness_multiplier: 0,
      verification_boosts: 0,
      final: 0,
    }
  }

  // 1. Base confidence from number of sources
  const baseConfidence = calculateBaseConfidence(sources.length)

  // 2. Weighted average of source reliabilities
  const sourceWeight = calculateSourceWeight(sources)

  // 3. Freshness multiplier (penalize stale data)
  const freshnessMultiplier = calculateFreshnessMultiplier(sources)

  // 4. Verification boosts (emails, phone numbers, etc.)
  const verificationBoosts = calculateVerificationBoosts(sources)

  // 5. Final score (base * source_weight * freshness + boosts)
  const final = Math.min(1.0, baseConfidence * sourceWeight * freshnessMultiplier + verificationBoosts)

  return {
    base: baseConfidence,
    source_weight: sourceWeight,
    freshness_multiplier: freshnessMultiplier,
    verification_boosts: verificationBoosts,
    final: Math.round(final * 100) / 100, // Round to 2 decimal places
  }
}

/**
 * Calculate base confidence from number of sources
 * More sources = higher confidence
 */
function calculateBaseConfidence(sourceCount: number): number {
  if (sourceCount === 0) return 0
  if (sourceCount === 1) return 0.6 // Single source
  if (sourceCount === 2) return 0.75 // Two sources
  if (sourceCount >= 3) return 0.85 // Three or more sources

  return 0.6
}

/**
 * Calculate weighted average of source reliabilities
 */
function calculateSourceWeight(sources: SourceData[]): number {
  let totalWeight = 0
  let weightSum = 0

  for (const source of sources) {
    const weight = SOURCE_WEIGHTS[source.source] || 0.5
    totalWeight += source.confidence * weight
    weightSum += weight
  }

  return weightSum > 0 ? totalWeight / weightSum : 0
}

/**
 * Calculate freshness multiplier
 * Penalize data that is too old
 */
function calculateFreshnessMultiplier(sources: SourceData[]): number {
  // Get average age across all sources
  const avgAge = sources.reduce((sum, s) => sum + s.age_days, 0) / sources.length

  if (avgAge <= 7) return 1.0 // Very fresh (< 1 week)
  if (avgAge <= 30) return 0.95 // Fresh (< 1 month)
  if (avgAge <= 90) return 0.9 // Recent (< 3 months)
  if (avgAge <= 180) return 0.85 // Acceptable (< 6 months)
  if (avgAge <= 365) return 0.75 // Old (< 1 year)

  return 0.6 // Very old (> 1 year)
}

/**
 * Calculate verification boosts
 * Add fixed boosts for verified information
 */
function calculateVerificationBoosts(sources: SourceData[]): number {
  let boosts = 0

  // Check for verified email
  const hasVerifiedEmail = sources.some((s) => {
    const data = s.data as any
    return data?.emails?.some((e: any) => e.verified)
  })

  if (hasVerifiedEmail) {
    boosts += 0.05
  }

  // Check for verified phone
  const hasVerifiedPhone = sources.some((s) => {
    const data = s.data as any
    return data?.phone?.verified
  })

  if (hasVerifiedPhone) {
    boosts += 0.05
  }

  return Math.min(0.15, boosts) // Cap total boosts at 0.15
}

/**
 * Get confidence level description
 */
export function getConfidenceLevel(score: number): 'very_high' | 'high' | 'medium' | 'low' {
  if (score >= 0.95) return 'very_high'
  if (score >= 0.85) return 'high'
  if (score >= 0.70) return 'medium'
  return 'low'
}

/**
 * Get confidence level message
 */
export function getConfidenceMessage(score: number): string {
  const level = getConfidenceLevel(score)

  switch (level) {
    case 'very_high':
      return 'Very high confidence - data from multiple sources, recently verified'
    case 'high':
      return 'High confidence - data from reliable sources, recently updated'
    case 'medium':
      return 'Medium confidence - data from 1-2 sources or slightly outdated'
    case 'low':
      return 'Low confidence - limited data or outdated information'
  }
}

/**
 * Combine emails from multiple sources
 * Deduplicates and ranks by confidence
 */
export function combineEmails(allEmails: any[]): any[] {
  const emailMap = new Map<string, any>()

  for (const email of allEmails) {
    const existing = emailMap.get(email.value.toLowerCase())

    if (!existing || email.confidence > existing.confidence) {
      emailMap.set(email.value.toLowerCase(), email)
    }
  }

  return Array.from(emailMap.values()).sort((a, b) => b.confidence - a.confidence)
}

/**
 * Determine primary email (highest confidence)
 */
export function getPrimaryEmail(emails: any[]): string | undefined {
  if (emails.length === 0) return undefined

  const sortedEmails = [...emails].sort((a, b) => {
    // Prioritize verified emails
    if (a.verified && !b.verified) return -1
    if (!a.verified && b.verified) return 1

    // Then by confidence
    return b.confidence - a.confidence
  })

  return sortedEmails[0].value
}

/**
 * Validate confidence score is within bounds
 */
export function validateConfidenceScore(score: number): boolean {
  return score >= 0 && score <= 1.0
}
