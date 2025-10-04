import { describe, it, expect } from 'vitest'
import {
  calculateConfidenceScore,
  getConfidenceLevel,
  getConfidenceMessage,
  combineEmails,
  getPrimaryEmail,
  validateConfidenceScore,
} from '@/enrichment/confidence'
import type { SourceData } from '@/types'

describe('Confidence Scoring', () => {
  describe('calculateConfidenceScore', () => {
    it('should return zero confidence for empty sources', () => {
      const result = calculateConfidenceScore([])

      expect(result.base).toBe(0)
      expect(result.source_weight).toBe(0)
      expect(result.freshness_multiplier).toBe(0)
      expect(result.verification_boosts).toBe(0)
      expect(result.final).toBe(0)
    })

    it('should calculate confidence for single source', () => {
      const sources: SourceData[] = [
        {
          source: 'github_profile',
          data: { username: 'testuser' },
          confidence: 0.9,
          age_days: 7,
          weight: 1.0,
        },
      ]

      const result = calculateConfidenceScore(sources)

      expect(result.base).toBe(0.6) // Single source
      expect(result.source_weight).toBeGreaterThan(0)
      expect(result.freshness_multiplier).toBe(1.0) // Fresh data (< 7 days)
      expect(result.final).toBeGreaterThan(0.5)
      expect(result.final).toBeLessThanOrEqual(1.0)
    })

    it('should calculate higher confidence for multiple sources', () => {
      const sources: SourceData[] = [
        {
          source: 'github_profile',
          data: { username: 'testuser' },
          confidence: 0.9,
          age_days: 7,
          weight: 1.0,
        },
        {
          source: 'github_commits',
          data: { commits: [] },
          confidence: 0.85,
          age_days: 14,
          weight: 0.9,
        },
      ]

      const result = calculateConfidenceScore(sources)

      expect(result.base).toBe(0.75) // Two sources
      expect(result.final).toBeGreaterThan(0.6)
    })

    it('should calculate highest confidence for 3+ sources', () => {
      const sources: SourceData[] = [
        {
          source: 'github_profile',
          data: { username: 'testuser' },
          confidence: 0.95,
          age_days: 3,
          weight: 1.0,
        },
        {
          source: 'github_commits',
          data: { commits: [] },
          confidence: 0.9,
          age_days: 3,
          weight: 0.9,
        },
        {
          source: 'whois',
          data: { domain: 'example.com' },
          confidence: 0.7,
          age_days: 7,
          weight: 0.7,
        },
      ]

      const result = calculateConfidenceScore(sources)

      expect(result.base).toBe(0.85) // Three sources
      expect(result.freshness_multiplier).toBe(1.0) // Very fresh
      expect(result.final).toBeGreaterThan(0.7)
    })

    it('should penalize stale data', () => {
      const freshSources: SourceData[] = [
        {
          source: 'github_profile',
          data: {},
          confidence: 0.9,
          age_days: 7,
          weight: 1.0,
        },
      ]

      const staleSources: SourceData[] = [
        {
          source: 'github_profile',
          data: {},
          confidence: 0.9,
          age_days: 365,
          weight: 1.0,
        },
      ]

      const freshResult = calculateConfidenceScore(freshSources)
      const staleResult = calculateConfidenceScore(staleSources)

      expect(freshResult.freshness_multiplier).toBeGreaterThan(staleResult.freshness_multiplier)
      expect(freshResult.final).toBeGreaterThan(staleResult.final)
    })

    it('should add boost for verified email', () => {
      const sourcesWithVerified: SourceData[] = [
        {
          source: 'github_profile',
          data: {
            emails: [{ value: 'test@example.com', verified: true }],
          },
          confidence: 0.9,
          age_days: 7,
          weight: 1.0,
        },
      ]

      const sourcesWithoutVerified: SourceData[] = [
        {
          source: 'github_profile',
          data: {
            emails: [{ value: 'test@example.com', verified: false }],
          },
          confidence: 0.9,
          age_days: 7,
          weight: 1.0,
        },
      ]

      const withVerifiedResult = calculateConfidenceScore(sourcesWithVerified)
      const withoutVerifiedResult = calculateConfidenceScore(sourcesWithoutVerified)

      expect(withVerifiedResult.verification_boosts).toBeGreaterThan(0)
      expect(withoutVerifiedResult.verification_boosts).toBe(0)
      expect(withVerifiedResult.final).toBeGreaterThan(withoutVerifiedResult.final)
    })

    it('should cap final score at 1.0', () => {
      const sources: SourceData[] = [
        {
          source: 'github_profile',
          data: {
            emails: [{ value: 'test@example.com', verified: true }],
            phone: { verified: true },
          },
          confidence: 1.0,
          age_days: 1,
          weight: 1.0,
        },
      ]

      const result = calculateConfidenceScore(sources)

      expect(result.final).toBeLessThanOrEqual(1.0)
    })
  })

  describe('getConfidenceLevel', () => {
    it('should return "very_high" for score >= 0.95', () => {
      expect(getConfidenceLevel(0.95)).toBe('very_high')
      expect(getConfidenceLevel(1.0)).toBe('very_high')
    })

    it('should return "high" for score >= 0.85', () => {
      expect(getConfidenceLevel(0.85)).toBe('high')
      expect(getConfidenceLevel(0.90)).toBe('high')
    })

    it('should return "medium" for score >= 0.70', () => {
      expect(getConfidenceLevel(0.70)).toBe('medium')
      expect(getConfidenceLevel(0.80)).toBe('medium')
    })

    it('should return "low" for score < 0.70', () => {
      expect(getConfidenceLevel(0.69)).toBe('low')
      expect(getConfidenceLevel(0.50)).toBe('low')
      expect(getConfidenceLevel(0.0)).toBe('low')
    })
  })

  describe('getConfidenceMessage', () => {
    it('should return appropriate message for each level', () => {
      expect(getConfidenceMessage(0.95)).toContain('Very high confidence')
      expect(getConfidenceMessage(0.85)).toContain('High confidence')
      expect(getConfidenceMessage(0.70)).toContain('Medium confidence')
      expect(getConfidenceMessage(0.50)).toContain('Low confidence')
    })
  })

  describe('combineEmails', () => {
    it('should deduplicate emails by value', () => {
      const emails = [
        { value: 'test@example.com', confidence: 0.8, verified: false },
        { value: 'test@example.com', confidence: 0.9, verified: true },
        { value: 'other@example.com', confidence: 0.7, verified: false },
      ]

      const result = combineEmails(emails)

      expect(result).toHaveLength(2)
      expect(result.find((e) => e.value === 'test@example.com')?.confidence).toBe(0.9)
      expect(result.find((e) => e.value === 'test@example.com')?.verified).toBe(true)
    })

    it('should sort emails by confidence descending', () => {
      const emails = [
        { value: 'low@example.com', confidence: 0.6 },
        { value: 'high@example.com', confidence: 0.9 },
        { value: 'medium@example.com', confidence: 0.7 },
      ]

      const result = combineEmails(emails)

      expect(result[0].value).toBe('high@example.com')
      expect(result[1].value).toBe('medium@example.com')
      expect(result[2].value).toBe('low@example.com')
    })

    it('should handle case-insensitive deduplication', () => {
      const emails = [
        { value: 'Test@Example.com', confidence: 0.8 },
        { value: 'test@example.com', confidence: 0.9 },
      ]

      const result = combineEmails(emails)

      expect(result).toHaveLength(1)
      expect(result[0].confidence).toBe(0.9)
    })
  })

  describe('getPrimaryEmail', () => {
    it('should return undefined for empty array', () => {
      expect(getPrimaryEmail([])).toBeUndefined()
    })

    it('should return the verified email if available', () => {
      const emails = [
        { value: 'unverified@example.com', confidence: 0.9, verified: false },
        { value: 'verified@example.com', confidence: 0.8, verified: true },
      ]

      expect(getPrimaryEmail(emails)).toBe('verified@example.com')
    })

    it('should return highest confidence if no verified emails', () => {
      const emails = [
        { value: 'low@example.com', confidence: 0.6, verified: false },
        { value: 'high@example.com', confidence: 0.9, verified: false },
        { value: 'medium@example.com', confidence: 0.7, verified: false },
      ]

      expect(getPrimaryEmail(emails)).toBe('high@example.com')
    })

    it('should prioritize verified over confidence', () => {
      const emails = [
        { value: 'highconf@example.com', confidence: 0.95, verified: false },
        { value: 'lowconf@example.com', confidence: 0.70, verified: true },
      ]

      expect(getPrimaryEmail(emails)).toBe('lowconf@example.com')
    })
  })

  describe('validateConfidenceScore', () => {
    it('should return true for valid scores', () => {
      expect(validateConfidenceScore(0.0)).toBe(true)
      expect(validateConfidenceScore(0.5)).toBe(true)
      expect(validateConfidenceScore(1.0)).toBe(true)
    })

    it('should return false for invalid scores', () => {
      expect(validateConfidenceScore(-0.1)).toBe(false)
      expect(validateConfidenceScore(1.1)).toBe(false)
      expect(validateConfidenceScore(Infinity)).toBe(false)
      expect(validateConfidenceScore(-Infinity)).toBe(false)
    })
  })
})
