import { describe, it, expect } from 'vitest'
import { extractEmails, extractDomain, extractGitHubUsername } from '@/lib/r2-query'
import type { GitHubProfileRaw, GitHubCommit } from '@/types'

describe('R2 Query Helpers', () => {
  describe('extractEmails', () => {
    it('should extract email from profile', () => {
      const profile: GitHubProfileRaw = {
        id: 123,
        login: 'testuser',
        email: 'test@example.com',
        public_repos: 10,
        followers: 50,
        following: 20,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }
      const commits: GitHubCommit[] = []

      const emails = extractEmails(profile, commits)

      expect(emails).toContain('test@example.com')
      expect(emails).toHaveLength(1)
    })

    it('should extract emails from commits', () => {
      const profile = null
      const commits: GitHubCommit[] = [
        {
          sha: 'abc123',
          repo_full_name: 'user/repo',
          author_email: 'author@example.com',
          committer_email: 'committer@example.com',
          message: 'test commit',
          committed_at: '2025-01-01T00:00:00Z',
          url: 'https://github.com/user/repo/commit/abc123',
        },
      ]

      const emails = extractEmails(profile, commits)

      expect(emails).toContain('author@example.com')
      expect(emails).toContain('committer@example.com')
      expect(emails).toHaveLength(2)
    })

    it('should deduplicate emails', () => {
      const profile: GitHubProfileRaw = {
        id: 123,
        login: 'testuser',
        email: 'test@example.com',
        public_repos: 10,
        followers: 50,
        following: 20,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }
      const commits: GitHubCommit[] = [
        {
          sha: 'abc123',
          repo_full_name: 'user/repo',
          author_email: 'test@example.com',
          committer_email: 'test@example.com',
          message: 'test commit',
          committed_at: '2025-01-01T00:00:00Z',
          url: 'https://github.com/user/repo/commit/abc123',
        },
      ]

      const emails = extractEmails(profile, commits)

      expect(emails).toHaveLength(1)
      expect(emails[0]).toBe('test@example.com')
    })

    it('should filter out noreply emails', () => {
      const profile = null
      const commits: GitHubCommit[] = [
        {
          sha: 'abc123',
          repo_full_name: 'user/repo',
          author_email: 'noreply@github.com',
          committer_email: 'test@example.com',
          message: 'test commit',
          committed_at: '2025-01-01T00:00:00Z',
          url: 'https://github.com/user/repo/commit/abc123',
        },
      ]

      const emails = extractEmails(profile, commits)

      expect(emails).not.toContain('noreply@github.com')
      expect(emails).toContain('test@example.com')
      expect(emails).toHaveLength(1)
    })

    it('should normalize emails to lowercase', () => {
      const profile: GitHubProfileRaw = {
        id: 123,
        login: 'testuser',
        email: 'Test@Example.COM',
        public_repos: 10,
        followers: 50,
        following: 20,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }
      const commits: GitHubCommit[] = []

      const emails = extractEmails(profile, commits)

      expect(emails[0]).toBe('test@example.com')
    })

    it('should return empty array when no emails found', () => {
      const profile: GitHubProfileRaw = {
        id: 123,
        login: 'testuser',
        public_repos: 10,
        followers: 50,
        following: 20,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }
      const commits: GitHubCommit[] = []

      const emails = extractEmails(profile, commits)

      expect(emails).toHaveLength(0)
    })
  })

  describe('extractDomain', () => {
    it('should extract domain from email', () => {
      const domain = extractDomain('test@example.com')

      expect(domain).toBe('example.com')
    })

    it('should normalize domain to lowercase', () => {
      const domain = extractDomain('test@Example.COM')

      expect(domain).toBe('example.com')
    })

    it('should handle subdomain emails', () => {
      const domain = extractDomain('test@mail.example.com')

      expect(domain).toBe('mail.example.com')
    })

    it('should throw error for invalid email', () => {
      expect(() => extractDomain('invalid-email')).toThrow('Invalid email format')
    })

    it('should throw error for multiple @ signs', () => {
      expect(() => extractDomain('test@@example.com')).toThrow('Invalid email format')
    })
  })

  describe('extractGitHubUsername', () => {
    it('should extract username from github.com URL', () => {
      const username = extractGitHubUsername('https://github.com/johndoe')

      expect(username).toBe('johndoe')
    })

    it('should extract username from github.com repo URL', () => {
      const username = extractGitHubUsername('https://github.com/johndoe/repo-name')

      expect(username).toBe('johndoe')
    })

    it('should handle case-insensitive github.com', () => {
      const username = extractGitHubUsername('https://GitHub.com/johndoe')

      expect(username).toBe('johndoe')
    })

    it('should handle URLs without protocol', () => {
      const username = extractGitHubUsername('github.com/johndoe')

      expect(username).toBe('johndoe')
    })

    it('should return null for invalid URLs', () => {
      const username = extractGitHubUsername('https://example.com/johndoe')

      expect(username).toBeNull()
    })

    it('should return null for github.com without username', () => {
      const username = extractGitHubUsername('https://github.com')

      expect(username).toBeNull()
    })
  })
})
