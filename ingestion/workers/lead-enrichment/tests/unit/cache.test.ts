import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateCacheKey } from '@/lib/cache'

describe('Cache Layer', () => {
  describe('generateCacheKey', () => {
    it('should generate key from email', () => {
      const input = { email: 'test@example.com' }
      const key = generateCacheKey(input)

      expect(key).toBe('email:test@example.com')
    })

    it('should normalize email to lowercase', () => {
      const input = { email: 'Test@Example.COM' }
      const key = generateCacheKey(input)

      expect(key).toBe('email:test@example.com')
    })

    it('should generate key from github_username', () => {
      const input = { github_username: 'johndoe' }
      const key = generateCacheKey(input)

      expect(key).toBe('github:johndoe')
    })

    it('should normalize github_username to lowercase', () => {
      const input = { github_username: 'JohnDoe' }
      const key = generateCacheKey(input)

      expect(key).toBe('github:johndoe')
    })

    it('should generate key from domain', () => {
      const input = { domain: 'example.com' }
      const key = generateCacheKey(input)

      expect(key).toBe('domain:example.com')
    })

    it('should normalize domain to lowercase and remove www', () => {
      const input = { domain: 'WWW.Example.COM' }
      const key = generateCacheKey(input)

      expect(key).toBe('domain:example.com')
    })

    it('should prioritize email over other fields', () => {
      const input = {
        email: 'test@example.com',
        github_username: 'johndoe',
        domain: 'example.com',
      }
      const key = generateCacheKey(input)

      expect(key).toBe('email:test@example.com')
    })

    it('should prioritize github_username over domain', () => {
      const input = {
        github_username: 'johndoe',
        domain: 'example.com',
      }
      const key = generateCacheKey(input)

      expect(key).toBe('github:johndoe')
    })

    it('should throw error for invalid input', () => {
      const input = {}

      expect(() => generateCacheKey(input as any)).toThrow('Invalid input for cache key generation')
    })
  })
})
