import { describe, it, expect } from 'vitest'
import {
  PersonEnrichmentRequestSchema,
  CompanyEnrichmentRequestSchema,
  BulkEnrichmentRequestSchema,
  SearchPeopleQuerySchema,
  ApiKeySchema,
} from '@/lib/validation'

describe('Validation Schemas', () => {
  describe('PersonEnrichmentRequestSchema', () => {
    it('should accept valid person enrichment request with email', () => {
      const data = { email: 'test@example.com' }
      const result = PersonEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should accept valid person enrichment request with github_username', () => {
      const data = { github_username: 'johndoe' }
      const result = PersonEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should accept valid person enrichment request with domain', () => {
      const data = { domain: 'example.com' }
      const result = PersonEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should accept valid person enrichment request with linkedin_url', () => {
      const data = { linkedin_url: 'https://linkedin.com/in/johndoe' }
      const result = PersonEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should accept valid person enrichment request with multiple fields', () => {
      const data = {
        email: 'test@example.com',
        github_username: 'johndoe',
        domain: 'example.com',
      }
      const result = PersonEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should reject invalid email format', () => {
      const data = { email: 'invalid-email' }
      const result = PersonEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject invalid linkedin_url format', () => {
      const data = { linkedin_url: 'not-a-url' }
      const result = PersonEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject empty object', () => {
      const data = {}
      const result = PersonEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(false)
    })
  })

  describe('CompanyEnrichmentRequestSchema', () => {
    it('should accept valid company enrichment request with domain', () => {
      const data = { domain: 'example.com' }
      const result = CompanyEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should accept valid company enrichment request with name', () => {
      const data = { name: 'Example Corp' }
      const result = CompanyEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should accept valid company enrichment request with website', () => {
      const data = { website: 'https://example.com' }
      const result = CompanyEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should reject invalid website format', () => {
      const data = { website: 'not-a-url' }
      const result = CompanyEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject empty object', () => {
      const data = {}
      const result = CompanyEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(false)
    })
  })

  describe('BulkEnrichmentRequestSchema', () => {
    it('should accept valid bulk person enrichment request', () => {
      const data = {
        type: 'person',
        items: [{ email: 'test1@example.com' }, { github_username: 'johndoe' }],
      }
      const result = BulkEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should accept valid bulk company enrichment request', () => {
      const data = {
        type: 'company',
        items: [{ domain: 'example.com' }, { name: 'Example Corp' }],
      }
      const result = BulkEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should reject bulk request with no items', () => {
      const data = {
        type: 'person',
        items: [],
      }
      const result = BulkEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject bulk request with more than 100 items', () => {
      const data = {
        type: 'person',
        items: Array(101).fill({ email: 'test@example.com' }),
      }
      const result = BulkEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should accept bulk request with exactly 100 items', () => {
      const data = {
        type: 'person',
        items: Array(100).fill({ email: 'test@example.com' }),
      }
      const result = BulkEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should reject invalid type', () => {
      const data = {
        type: 'invalid',
        items: [{ email: 'test@example.com' }],
      }
      const result = BulkEnrichmentRequestSchema.safeParse(data)

      expect(result.success).toBe(false)
    })
  })

  describe('SearchPeopleQuerySchema', () => {
    it('should accept valid search query', () => {
      const data = { domain: 'example.com' }
      const result = SearchPeopleQuerySchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.domain).toBe('example.com')
      }
    })

    it('should accept valid search query with limit', () => {
      const data = { domain: 'example.com', limit: '50' }
      const result = SearchPeopleQuerySchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
      }
    })

    it('should accept valid search query with offset', () => {
      const data = { domain: 'example.com', offset: '10' }
      const result = SearchPeopleQuerySchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.offset).toBe(10)
      }
    })

    it('should reject limit > 100', () => {
      const data = { domain: 'example.com', limit: '101' }
      const result = SearchPeopleQuerySchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject negative offset', () => {
      const data = { domain: 'example.com', offset: '-1' }
      const result = SearchPeopleQuerySchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject missing domain', () => {
      const data = {}
      const result = SearchPeopleQuerySchema.safeParse(data)

      expect(result.success).toBe(false)
    })
  })

  describe('ApiKeySchema', () => {
    it('should accept valid live API key', () => {
      const key = 'api_live_' + 'a'.repeat(32)
      const result = ApiKeySchema.safeParse(key)

      expect(result.success).toBe(true)
    })

    it('should accept valid test API key', () => {
      const key = 'api_test_' + 'b'.repeat(32)
      const result = ApiKeySchema.safeParse(key)

      expect(result.success).toBe(true)
    })

    it('should reject API key with wrong prefix', () => {
      const key = 'api_prod_' + 'a'.repeat(32)
      const result = ApiKeySchema.safeParse(key)

      expect(result.success).toBe(false)
    })

    it('should reject API key with wrong length', () => {
      const key = 'api_live_' + 'a'.repeat(20) // Too short
      const result = ApiKeySchema.safeParse(key)

      expect(result.success).toBe(false)
    })

    it('should reject API key with invalid characters', () => {
      const key = 'api_live_' + 'a'.repeat(30) + '$$'
      const result = ApiKeySchema.safeParse(key)

      expect(result.success).toBe(false)
    })

    it('should reject empty string', () => {
      const result = ApiKeySchema.safeParse('')

      expect(result.success).toBe(false)
    })

    it('should reject non-string values', () => {
      const result = ApiKeySchema.safeParse(12345)

      expect(result.success).toBe(false)
    })
  })
})
