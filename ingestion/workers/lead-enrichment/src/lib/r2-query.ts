import type { R2Bucket } from '@cloudflare/workers-types'
import type { GitHubProfileRaw, GitHubCommit, WhoisRecord } from '../types'

/**
 * R2 Query Layer - Queries Parquet data stored in R2
 *
 * Data structure in R2:
 * - github/profiles/*.parquet
 * - github/commits/*.parquet
 * - github/repos/*.parquet
 * - whois/domains/*.parquet
 */

/**
 * Query GitHub profile by username
 */
export async function queryGitHubProfile(bucket: R2Bucket, username: string): Promise<GitHubProfileRaw | null> {
  // Normalize username to lowercase for case-insensitive lookup
  const normalizedUsername = username.toLowerCase()

  // GitHub profiles are stored as: github/profiles/{first_letter}/{username}.json
  const firstLetter = normalizedUsername[0]
  const key = `github/profiles/${firstLetter}/${normalizedUsername}.json`

  try {
    const object = await bucket.get(key)

    if (!object) {
      return null
    }

    const data = await object.json<GitHubProfileRaw>()
    return data
  } catch (error) {
    console.error('Error querying GitHub profile:', error)
    return null
  }
}

/**
 * Query GitHub commits by email
 */
export async function queryGitHubCommitsByEmail(bucket: R2Bucket, email: string): Promise<GitHubCommit[]> {
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase()

  // Commits are indexed by email domain: github/commits/by-email/{domain}/{email}.json
  const domain = normalizedEmail.split('@')[1]
  const key = `github/commits/by-email/${domain}/${normalizedEmail}.json`

  try {
    const object = await bucket.get(key)

    if (!object) {
      return []
    }

    const data = await object.json<GitHubCommit[]>()
    return data
  } catch (error) {
    console.error('Error querying GitHub commits by email:', error)
    return []
  }
}

/**
 * Query GitHub repos by username
 */
export async function queryGitHubRepos(bucket: R2Bucket, username: string): Promise<any[]> {
  // Normalize username to lowercase
  const normalizedUsername = username.toLowerCase()

  // Repos are stored as: github/repos/{first_letter}/{username}.json
  const firstLetter = normalizedUsername[0]
  const key = `github/repos/${firstLetter}/${normalizedUsername}.json`

  try {
    const object = await bucket.get(key)

    if (!object) {
      return []
    }

    const data = await object.json<any[]>()
    return data
  } catch (error) {
    console.error('Error querying GitHub repos:', error)
    return []
  }
}

/**
 * Query WHOIS record by domain
 */
export async function queryWhoisRecord(bucket: R2Bucket, domain: string): Promise<WhoisRecord | null> {
  // Normalize domain to lowercase and remove www. prefix
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '')

  // Extract TLD
  const parts = normalizedDomain.split('.')
  const tld = parts[parts.length - 1]

  // WHOIS records are stored as: whois/{tld}/{domain}.json
  const key = `whois/${tld}/${normalizedDomain}.json`

  try {
    const object = await bucket.get(key)

    if (!object) {
      return null
    }

    const data = await object.json<WhoisRecord>()
    return data
  } catch (error) {
    console.error('Error querying WHOIS record:', error)
    return null
  }
}

/**
 * Query GitHub organization by login
 */
export async function queryGitHubOrganization(bucket: R2Bucket, login: string): Promise<any | null> {
  // Normalize login to lowercase
  const normalizedLogin = login.toLowerCase()

  // Organizations are stored as: github/orgs/{first_letter}/{login}.json
  const firstLetter = normalizedLogin[0]
  const key = `github/orgs/${firstLetter}/${normalizedLogin}.json`

  try {
    const object = await bucket.get(key)

    if (!object) {
      return null
    }

    const data = await object.json<any>()
    return data
  } catch (error) {
    console.error('Error querying GitHub organization:', error)
    return null
  }
}

/**
 * Search GitHub profiles by email domain
 */
export async function searchGitHubProfilesByDomain(bucket: R2Bucket, domain: string, limit: number = 50): Promise<GitHubProfileRaw[]> {
  // Normalize domain to lowercase
  const normalizedDomain = domain.toLowerCase()

  // Profiles indexed by domain: github/profiles/by-domain/{domain}.json
  const key = `github/profiles/by-domain/${normalizedDomain}.json`

  try {
    const object = await bucket.get(key)

    if (!object) {
      return []
    }

    const data = await object.json<GitHubProfileRaw[]>()
    return data.slice(0, limit)
  } catch (error) {
    console.error('Error searching GitHub profiles by domain:', error)
    return []
  }
}

/**
 * Batch query GitHub profiles
 */
export async function batchQueryGitHubProfiles(bucket: R2Bucket, usernames: string[]): Promise<Map<string, GitHubProfileRaw>> {
  const results = new Map<string, GitHubProfileRaw>()

  // Query profiles in parallel
  await Promise.all(
    usernames.map(async (username) => {
      const profile = await queryGitHubProfile(bucket, username)
      if (profile) {
        results.set(username.toLowerCase(), profile)
      }
    })
  )

  return results
}

/**
 * Batch query WHOIS records
 */
export async function batchQueryWhoisRecords(bucket: R2Bucket, domains: string[]): Promise<Map<string, WhoisRecord>> {
  const results = new Map<string, WhoisRecord>()

  // Query WHOIS records in parallel
  await Promise.all(
    domains.map(async (domain) => {
      const record = await queryWhoisRecord(bucket, domain)
      if (record) {
        results.set(domain.toLowerCase().replace(/^www\./, ''), record)
      }
    })
  )

  return results
}

/**
 * Check if data exists in R2 for a given key
 */
export async function dataExists(bucket: R2Bucket, key: string): Promise<boolean> {
  try {
    const object = await bucket.head(key)
    return object !== null
  } catch (error) {
    return false
  }
}

/**
 * Get data freshness (age in days)
 */
export async function getDataFreshness(bucket: R2Bucket, key: string): Promise<number | null> {
  try {
    const object = await bucket.head(key)

    if (!object || !object.uploaded) {
      return null
    }

    const uploadedAt = object.uploaded
    const now = new Date()
    const ageDays = Math.floor((now.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24))

    return ageDays
  } catch (error) {
    console.error('Error getting data freshness:', error)
    return null
  }
}

/**
 * Extract email from GitHub profile or commits
 */
export function extractEmails(profile: GitHubProfileRaw | null, commits: GitHubCommit[]): string[] {
  const emails = new Set<string>()

  // Add email from profile
  if (profile?.email && profile.email !== '') {
    emails.add(profile.email.toLowerCase())
  }

  // Add emails from commits
  for (const commit of commits) {
    if (commit.author_email && commit.author_email !== 'noreply@github.com') {
      emails.add(commit.author_email.toLowerCase())
    }
    if (commit.committer_email && commit.committer_email !== 'noreply@github.com') {
      emails.add(commit.committer_email.toLowerCase())
    }
  }

  return Array.from(emails)
}

/**
 * Extract domain from email
 */
export function extractDomain(email: string): string {
  const parts = email.split('@')
  if (parts.length !== 2) {
    throw new Error('Invalid email format')
  }
  return parts[1].toLowerCase()
}

/**
 * Extract GitHub username from URL
 */
export function extractGitHubUsername(url: string): string | null {
  const match = url.match(/github\.com\/([^\/]+)/i)
  return match ? match[1] : null
}
