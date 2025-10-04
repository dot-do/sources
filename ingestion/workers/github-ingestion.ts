/**
 * GitHub Data Ingestion Worker
 *
 * Ingests data from GitHub for email extraction:
 * 1. User profiles (public email addresses)
 * 2. Repository metadata (contributor info, links to commits)
 * 3. Git commits (author/committer email addresses)
 *
 * Primary goal: Extract email addresses from commits, profiles, and repos
 *
 * API Endpoints:
 * - GET /sync/profile?username=<username> - Fetch single user profile
 * - GET /sync/repo?owner=<owner>&repo=<repo> - Fetch repository metadata
 * - GET /sync/commits?domain=<domain>&per_page=100 - Search commits by email domain
 * - GET /sync/commits/repo?owner=<owner>&repo=<repo> - Get commits from specific repo
 * - POST /sync/bulk/profiles - Bulk profile sync (body: { usernames: string[] })
 * - POST /sync/bulk/repos - Bulk repo sync (body: { repos: Array<{owner, repo}> })
 * - GET /status - Get sync status and stats
 *
 * Scheduled:
 * - Cron: Incremental sync of recent commits
 *
 * Rate Limits:
 * - 5000 req/hour with token
 * - 60 req/hour without token
 *
 * References:
 * - https://docs.github.com/en/rest
 * - https://docs.github.com/en/rest/search#search-commits
 * - https://docs.github.com/en/rest/users
 * - https://docs.github.com/en/rest/repos
 */

import { Hono } from 'hono'

export interface Env {
  DB: D1Database
  DATA_BUCKET: R2Bucket
  KV: KVNamespace
  INGESTION_QUEUE: Queue
  ANALYTICS: AnalyticsEngineDataset
  GITHUB_TOKEN?: string
}

interface GitHubProfile {
  id: number
  login: string
  name?: string
  email?: string
  company?: string
  blog?: string
  location?: string
  bio?: string
  public_repos: number
  public_gists: number
  followers: number
  following: number
  created_at: string
  updated_at: string
}

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  owner: {
    login: string
    id: number
  }
  description?: string
  language?: string
  license?: {
    name: string
    spdx_id: string
  }
  homepage?: string
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  size: number
  fork: boolean
  archived: boolean
  disabled: boolean
  created_at: string
  updated_at: string
  pushed_at: string
  topics: string[]
}

interface GitHubCommit {
  sha: string
  commit: {
    author: {
      name: string
      email: string
      date: string
    }
    committer: {
      name: string
      email: string
      date: string
    }
    message: string
  }
  author?: {
    login: string
    id: number
  }
  committer?: {
    login: string
    id: number
  }
  stats?: {
    additions: number
    deletions: number
    total: number
  }
  repository?: {
    full_name: string
  }
}

interface IngestionRun {
  id?: number
  source: string
  run_type: string
  records_processed: number
  records_inserted: number
  records_updated: number
  records_failed: number
  started_at: string
  completed_at?: string
  duration_ms?: number
  status: 'running' | 'completed' | 'failed'
  error_message?: string
  cursor?: string
  data?: string
}

const app = new Hono<{ Bindings: Env }>()

// ============================================================================
// Sync Endpoints
// ============================================================================

app.get('/sync/profile', async (c) => {
  const username = c.req.query('username')
  if (!username) {
    return c.json({ error: 'username query parameter required' }, 400)
  }

  try {
    const profile = await fetchProfile(username, c.env)

    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    // Queue for ingestion
    await c.env.INGESTION_QUEUE.send({
      source: 'github',
      action: 'upsert',
      data: {
        type: 'profile',
        ...profile
      },
      timestamp: Date.now()
    })

    return c.json({
      status: 'queued',
      profile: {
        login: profile.login,
        name: profile.name,
        email: profile.email,
        company: profile.company,
        public_repos: profile.public_repos,
        followers: profile.followers
      }
    })
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return c.json({ error: error.message }, 500)
  }
})

app.get('/sync/repo', async (c) => {
  const owner = c.req.query('owner')
  const repo = c.req.query('repo')

  if (!owner || !repo) {
    return c.json({ error: 'owner and repo query parameters required' }, 400)
  }

  try {
    const repoData = await fetchRepo(owner, repo, c.env)

    if (!repoData) {
      return c.json({ error: 'Repository not found' }, 404)
    }

    // Queue for ingestion
    await c.env.INGESTION_QUEUE.send({
      source: 'github',
      action: 'upsert',
      data: {
        type: 'repo',
        ...repoData
      },
      timestamp: Date.now()
    })

    return c.json({
      status: 'queued',
      repo: {
        full_name: repoData.full_name,
        description: repoData.description,
        language: repoData.language,
        stargazers_count: repoData.stargazers_count,
        forks_count: repoData.forks_count
      }
    })
  } catch (error: any) {
    console.error('Error fetching repo:', error)
    return c.json({ error: error.message }, 500)
  }
})

app.get('/sync/commits', async (c) => {
  const domain = c.req.query('domain')
  const perPage = parseInt(c.req.query('per_page') || '100')

  if (!domain) {
    return c.json({ error: 'domain query parameter required' }, 400)
  }

  try {
    const commits = await searchCommitsByDomain(domain, perPage, c.env)

    // Queue all commits
    const queuePromises = commits.map(commit =>
      c.env.INGESTION_QUEUE.send({
        source: 'github',
        action: 'upsert',
        data: {
          type: 'commit',
          ...commit
        },
        timestamp: Date.now()
      })
    )

    await Promise.all(queuePromises)

    return c.json({
      status: 'queued',
      commits_found: commits.length,
      domain,
      sample_emails: extractUniqueEmails(commits, domain)
    })
  } catch (error: any) {
    console.error('Error searching commits:', error)
    return c.json({ error: error.message }, 500)
  }
})

app.get('/sync/commits/repo', async (c) => {
  const owner = c.req.query('owner')
  const repo = c.req.query('repo')
  const perPage = parseInt(c.req.query('per_page') || '100')

  if (!owner || !repo) {
    return c.json({ error: 'owner and repo query parameters required' }, 400)
  }

  try {
    const commits = await fetchRepoCommits(owner, repo, perPage, c.env)

    // Queue all commits
    const queuePromises = commits.map(commit =>
      c.env.INGESTION_QUEUE.send({
        source: 'github',
        action: 'upsert',
        data: {
          type: 'commit',
          repo_full_name: `${owner}/${repo}`,
          ...commit
        },
        timestamp: Date.now()
      })
    )

    await Promise.all(queuePromises)

    return c.json({
      status: 'queued',
      commits_found: commits.length,
      repo: `${owner}/${repo}`,
      sample_emails: extractAllUniqueEmails(commits)
    })
  } catch (error: any) {
    console.error('Error fetching repo commits:', error)
    return c.json({ error: error.message }, 500)
  }
})

app.post('/sync/bulk/profiles', async (c) => {
  const body = await c.req.json()
  const usernames = body.usernames as string[]

  if (!Array.isArray(usernames) || usernames.length === 0) {
    return c.json({ error: 'usernames array required in body' }, 400)
  }

  const runId = await createIngestionRun(c.env, {
    source: 'github',
    run_type: 'bulk_profile_sync',
    started_at: new Date().toISOString(),
    status: 'running',
    records_processed: 0,
    records_inserted: 0,
    records_updated: 0,
    records_failed: 0
  })

  // Process in background (don't await)
  c.executionCtx.waitUntil(
    processBulkProfiles(usernames, runId, c.env)
  )

  return c.json({
    status: 'processing',
    run_id: runId,
    usernames_count: usernames.length
  })
})

app.post('/sync/bulk/repos', async (c) => {
  const body = await c.req.json()
  const repos = body.repos as Array<{ owner: string, repo: string }>

  if (!Array.isArray(repos) || repos.length === 0) {
    return c.json({ error: 'repos array required in body' }, 400)
  }

  const runId = await createIngestionRun(c.env, {
    source: 'github',
    run_type: 'bulk_repo_sync',
    started_at: new Date().toISOString(),
    status: 'running',
    records_processed: 0,
    records_inserted: 0,
    records_updated: 0,
    records_failed: 0
  })

  // Process in background
  c.executionCtx.waitUntil(
    processBulkRepos(repos, runId, c.env)
  )

  return c.json({
    status: 'processing',
    run_id: runId,
    repos_count: repos.length
  })
})

app.get('/status', async (c) => {
  const recentRuns = await c.env.DB.prepare(`
    SELECT * FROM ingestion_runs
    WHERE source = 'github'
    ORDER BY started_at DESC
    LIMIT 10
  `).all()

  const syncState = await c.env.DB.prepare(`
    SELECT * FROM sync_state WHERE source = 'github'
  `).first()

  return c.json({
    recent_runs: recentRuns.results,
    sync_state: syncState,
    rate_limit_info: {
      limit: 5000,
      window: '1 hour',
      requires_token: true
    }
  })
})

// ============================================================================
// GitHub API Fetchers
// ============================================================================

async function fetchProfile(username: string, env: Env): Promise<GitHubProfile | null> {
  const url = `https://api.github.com/users/${username}`
  const headers = buildHeaders(env)

  const response = await fetch(url, { headers })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

async function fetchRepo(owner: string, repo: string, env: Env): Promise<GitHubRepo | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}`
  const headers = buildHeaders(env)

  const response = await fetch(url, { headers })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

async function searchCommitsByDomain(domain: string, perPage: number, env: Env): Promise<GitHubCommit[]> {
  const url = `https://api.github.com/search/commits?q=author-email:@${domain}&per_page=${perPage}`
  const headers = buildHeaders(env, true) // commit search requires special header

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.items || []
}

async function fetchRepoCommits(owner: string, repo: string, perPage: number, env: Env): Promise<GitHubCommit[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}`
  const headers = buildHeaders(env)

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

function buildHeaders(env: Env, commitSearch = false): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'data-ingestion-worker',
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }

  if (commitSearch) {
    headers['Accept'] = 'application/vnd.github.cloak-preview+json'
  }

  if (env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`
  }

  return headers
}

// ============================================================================
// Bulk Processing
// ============================================================================

async function processBulkProfiles(usernames: string[], runId: number, env: Env) {
  let processed = 0
  let inserted = 0
  let failed = 0

  for (const username of usernames) {
    try {
      const profile = await fetchProfile(username, env)

      if (profile) {
        await env.INGESTION_QUEUE.send({
          source: 'github',
          action: 'upsert',
          data: {
            type: 'profile',
            ...profile
          },
          timestamp: Date.now()
        })
        inserted++
      }

      processed++

      // Rate limiting: ~4000 req/hour = 1 req/sec
      await sleep(1000)
    } catch (error) {
      console.error(`Error processing profile ${username}:`, error)
      failed++
    }
  }

  // Update run
  await updateIngestionRun(env, runId, {
    status: 'completed',
    records_processed: processed,
    records_inserted: inserted,
    records_failed: failed,
    completed_at: new Date().toISOString()
  })
}

async function processBulkRepos(repos: Array<{ owner: string, repo: string }>, runId: number, env: Env) {
  let processed = 0
  let inserted = 0
  let failed = 0

  for (const { owner, repo } of repos) {
    try {
      const repoData = await fetchRepo(owner, repo, env)

      if (repoData) {
        await env.INGESTION_QUEUE.send({
          source: 'github',
          action: 'upsert',
          data: {
            type: 'repo',
            ...repoData
          },
          timestamp: Date.now()
        })
        inserted++
      }

      processed++

      // Rate limiting
      await sleep(1000)
    } catch (error) {
      console.error(`Error processing repo ${owner}/${repo}:`, error)
      failed++
    }
  }

  // Update run
  await updateIngestionRun(env, runId, {
    status: 'completed',
    records_processed: processed,
    records_inserted: inserted,
    records_failed: failed,
    completed_at: new Date().toISOString()
  })
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractUniqueEmails(commits: GitHubCommit[], domain: string): string[] {
  const emails = new Set<string>()

  for (const commit of commits) {
    if (commit.commit?.author?.email?.endsWith(`@${domain}`)) {
      emails.add(commit.commit.author.email)
    }
    if (commit.commit?.committer?.email?.endsWith(`@${domain}`)) {
      emails.add(commit.commit.committer.email)
    }
  }

  return Array.from(emails).slice(0, 10)
}

function extractAllUniqueEmails(commits: GitHubCommit[]): string[] {
  const emails = new Set<string>()

  for (const commit of commits) {
    if (commit.commit?.author?.email) {
      emails.add(commit.commit.author.email)
    }
    if (commit.commit?.committer?.email) {
      emails.add(commit.commit.committer.email)
    }
  }

  return Array.from(emails).slice(0, 10)
}

async function createIngestionRun(env: Env, run: Omit<IngestionRun, 'id'>): Promise<number> {
  const result = await env.DB.prepare(`
    INSERT INTO ingestion_runs (
      source, run_type, records_processed, records_inserted, records_updated,
      records_failed, started_at, completed_at, duration_ms, status,
      error_message, cursor, data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    run.source,
    run.run_type,
    run.records_processed,
    run.records_inserted,
    run.records_updated,
    run.records_failed,
    run.started_at,
    run.completed_at || null,
    run.duration_ms || null,
    run.status,
    run.error_message || null,
    run.cursor || null,
    run.data || null
  ).run()

  return result.meta.last_row_id as number
}

async function updateIngestionRun(
  env: Env,
  runId: number,
  updates: Partial<IngestionRun>
): Promise<void> {
  const fields: string[] = []
  const values: any[] = []

  if (updates.records_processed !== undefined) {
    fields.push('records_processed = ?')
    values.push(updates.records_processed)
  }
  if (updates.records_inserted !== undefined) {
    fields.push('records_inserted = ?')
    values.push(updates.records_inserted)
  }
  if (updates.records_updated !== undefined) {
    fields.push('records_updated = ?')
    values.push(updates.records_updated)
  }
  if (updates.records_failed !== undefined) {
    fields.push('records_failed = ?')
    values.push(updates.records_failed)
  }
  if (updates.completed_at) {
    fields.push('completed_at = ?')
    values.push(updates.completed_at)
  }
  if (updates.status) {
    fields.push('status = ?')
    values.push(updates.status)
  }
  if (updates.error_message) {
    fields.push('error_message = ?')
    values.push(updates.error_message)
  }

  if (fields.length === 0) return

  values.push(runId)

  await env.DB.prepare(`
    UPDATE ingestion_runs SET ${fields.join(', ')} WHERE id = ?
  `).bind(...values).run()
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// Scheduled Handler
// ============================================================================

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Running scheduled GitHub sync')

    // Get list of domains to monitor from KV or DB
    const domainsJson = await env.KV.get('github:domains')
    if (!domainsJson) {
      console.log('No domains configured for monitoring')
      return
    }

    const domains = JSON.parse(domainsJson) as string[]

    const runId = await createIngestionRun(env, {
      source: 'github',
      run_type: 'scheduled_commit_sync',
      started_at: new Date().toISOString(),
      status: 'running',
      records_processed: 0,
      records_inserted: 0,
      records_updated: 0,
      records_failed: 0
    })

    let totalCommits = 0

    for (const domain of domains) {
      try {
        const commits = await searchCommitsByDomain(domain, 100, env)

        // Queue commits
        await Promise.all(
          commits.map(commit =>
            env.INGESTION_QUEUE.send({
              source: 'github',
              action: 'upsert',
              data: {
                type: 'commit',
                ...commit
              },
              timestamp: Date.now()
            })
          )
        )

        totalCommits += commits.length

        // Rate limiting
        await sleep(5000) // 5 seconds between domain searches
      } catch (error) {
        console.error(`Error syncing commits for domain ${domain}:`, error)
      }
    }

    await updateIngestionRun(env, runId, {
      status: 'completed',
      records_processed: totalCommits,
      records_inserted: totalCommits,
      completed_at: new Date().toISOString()
    })

    console.log(`Scheduled sync completed: ${totalCommits} commits queued`)
  }
}
