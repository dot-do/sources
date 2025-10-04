import type { R2Bucket } from '@cloudflare/workers-types'
import type { GitHubProfile, Email, Repository, DataSource } from '../types'
import {
  queryGitHubProfile,
  queryGitHubCommitsByEmail,
  queryGitHubRepos,
  queryGitHubOrganization,
  extractEmails,
  extractDomain,
  getDataFreshness,
} from '../lib/r2-query'

/**
 * GitHub Data Source
 * Enriches people and companies using GitHub data from R2
 */

export interface GitHubEnrichmentResult {
  profile: GitHubProfile | null
  emails: Email[]
  confidence: number
  data_sources: DataSource[]
  age_days: number
}

/**
 * Enrich person using GitHub username
 */
export async function enrichPersonByGitHubUsername(bucket: R2Bucket, username: string): Promise<GitHubEnrichmentResult> {
  const profile = await queryGitHubProfile(bucket, username)

  if (!profile) {
    return {
      profile: null,
      emails: [],
      confidence: 0,
      data_sources: [],
      age_days: 999,
    }
  }

  // Get commits to find additional emails
  const commits = profile.email ? await queryGitHubCommitsByEmail(bucket, profile.email) : []

  // Get repos for additional context
  const repos = await queryGitHubRepos(bucket, username)

  // Extract all emails from profile and commits
  const emailStrings = extractEmails(profile, commits)

  // Build Email objects with confidence scoring
  const emails: Email[] = emailStrings.map((email) => ({
    value: email,
    type: inferEmailType(email),
    source: 'github_commits',
    confidence: calculateEmailConfidence(email, commits),
    verified: profile.email === email, // Email is verified if it's the public profile email
    last_seen: commits.find((c) => c.author_email === email || c.committer_email === email)?.committed_at || new Date().toISOString(),
  }))

  // Calculate data freshness
  const profileKey = `github/profiles/${username[0].toLowerCase()}/${username.toLowerCase()}.json`
  const ageDays = (await getDataFreshness(bucket, profileKey)) || 999

  // Extract top languages from repos
  const languages = extractTopLanguages(repos)

  // Extract top repos (by stars)
  const topRepos = repos
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 5)
    .map(
      (repo): Repository => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        watchers: repo.watchers_count || 0,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
      })
    )

  // Build GitHubProfile
  const enrichedProfile: GitHubProfile = {
    username: profile.login,
    url: `https://github.com/${profile.login}`,
    name: profile.name || undefined,
    email: profile.email || undefined,
    bio: profile.bio || undefined,
    location: profile.location || undefined,
    company: profile.company || undefined,
    blog: profile.blog || undefined,
    public_repos: profile.public_repos,
    followers: profile.followers,
    following: profile.following,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    avatar_url: profile.avatar_url || undefined,
    languages,
    top_repos: topRepos,
  }

  // Calculate confidence score
  const confidence = calculateGitHubConfidence(enrichedProfile, emails, ageDays)

  // Determine data sources used
  const dataSources: DataSource[] = ['github_profile']
  if (commits.length > 0) {
    dataSources.push('github_commits')
  }
  if (repos.length > 0) {
    dataSources.push('github_repos')
  }

  return {
    profile: enrichedProfile,
    emails,
    confidence,
    data_sources: dataSources,
    age_days: ageDays,
  }
}

/**
 * Enrich person using email address
 */
export async function enrichPersonByEmail(bucket: R2Bucket, email: string): Promise<GitHubEnrichmentResult> {
  // Query commits by email
  const commits = await queryGitHubCommitsByEmail(bucket, email)

  if (commits.length === 0) {
    return {
      profile: null,
      emails: [],
      confidence: 0,
      data_sources: [],
      age_days: 999,
    }
  }

  // Extract unique usernames from commits
  const usernames = new Set<string>()
  for (const commit of commits) {
    // GitHub commit URLs have format: https://github.com/{owner}/{repo}/commit/{sha}
    // We need to extract the author's username, which might be in author_name or from the repo owner
    const match = commit.url.match(/github\.com\/([^\/]+)/)
    if (match) {
      usernames.add(match[1])
    }
  }

  // If we found usernames, try to get their profiles
  if (usernames.size > 0) {
    // Use the first username (most common contributor)
    const username = Array.from(usernames)[0]
    return enrichPersonByGitHubUsername(bucket, username)
  }

  // If no usernames found, return commits only
  const emails: Email[] = [
    {
      value: email,
      type: inferEmailType(email),
      source: 'github_commits',
      confidence: calculateEmailConfidence(email, commits),
      verified: false,
      last_seen: commits[0].committed_at,
    },
  ]

  return {
    profile: null,
    emails,
    confidence: 0.6, // Medium confidence from commits only
    data_sources: ['github_commits'],
    age_days: 30, // Assume 30 days for commits
  }
}

/**
 * Enrich company using domain
 */
export async function enrichCompanyByDomain(bucket: R2Bucket, domain: string): Promise<any> {
  // Search for GitHub organization matching domain
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '')

  // Try common organization name patterns
  const orgNames = [
    normalizedDomain.split('.')[0], // example.com → example
    normalizedDomain.replace(/\./g, '-'), // example.com → example-com
    normalizedDomain.replace(/\./g, ''), // example.com → examplecom
  ]

  for (const orgName of orgNames) {
    const org = await queryGitHubOrganization(bucket, orgName)
    if (org) {
      return {
        organization: org,
        confidence: 0.7,
        data_sources: ['github_org'],
      }
    }
  }

  return {
    organization: null,
    confidence: 0,
    data_sources: [],
  }
}

/**
 * Helper functions
 */

function inferEmailType(email: string): 'work' | 'personal' | 'admin' | 'technical' | 'general' {
  const localPart = email.split('@')[0].toLowerCase()

  if (localPart.startsWith('admin') || localPart.includes('admin')) {
    return 'admin'
  }
  if (localPart.startsWith('tech') || localPart.includes('support') || localPart.includes('help')) {
    return 'technical'
  }
  if (localPart === 'info' || localPart === 'contact' || localPart === 'hello') {
    return 'general'
  }
  if (email.includes('gmail.com') || email.includes('yahoo.com') || email.includes('hotmail.com')) {
    return 'personal'
  }

  return 'work'
}

function calculateEmailConfidence(email: string, commits: any[]): number {
  // Base confidence
  let confidence = 0.7

  // Boost for number of commits
  if (commits.length >= 100) {
    confidence += 0.2
  } else if (commits.length >= 10) {
    confidence += 0.1
  }

  // Penalize for generic emails
  const localPart = email.split('@')[0].toLowerCase()
  if (localPart === 'noreply' || localPart === 'no-reply') {
    confidence -= 0.5
  }

  return Math.min(1.0, Math.max(0.0, confidence))
}

function calculateGitHubConfidence(profile: GitHubProfile, emails: Email[], ageDays: number): number {
  let confidence = 0.85 // Base confidence for GitHub profile

  // Boost for verified email
  if (profile.email) {
    confidence += 0.05
  }

  // Boost for activity
  if (profile.public_repos > 10) {
    confidence += 0.05
  }

  // Boost for followers
  if (profile.followers > 100) {
    confidence += 0.05
  }

  // Penalize for stale data
  if (ageDays > 30) {
    confidence -= 0.1
  }
  if (ageDays > 90) {
    confidence -= 0.1
  }

  return Math.min(1.0, Math.max(0.0, confidence))
}

function extractTopLanguages(repos: any[]): string[] {
  const languageCounts = new Map<string, number>()

  for (const repo of repos) {
    if (repo.language) {
      languageCounts.set(repo.language, (languageCounts.get(repo.language) || 0) + 1)
    }
  }

  return Array.from(languageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang)
}
