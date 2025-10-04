import type { Context } from 'hono'
import type { Env, ContextVariables, SearchPeopleResponse, ApiKey } from '../types'
import { validateQueryParams, SearchPeopleQuerySchema } from '../lib/validation'
import { searchCachedPeopleByDomain } from '../lib/cache'
import { searchGitHubProfilesByDomain } from '../lib/r2-query'

/**
 * GET /v1/search/people?domain=example.com&limit=50
 * Search for people associated with a company domain
 */
export async function searchPeopleRoute(c: Context<{ Bindings: Env; Variables: ContextVariables }>) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  const apiKey = c.get('api_key') as ApiKey

  try {
    // Validate query parameters
    const url = new URL(c.req.url)
    const validation = validateQueryParams(url, SearchPeopleQuerySchema)

    if (!validation.success) {
      await logUsage(c.env, apiKey, requestId, c.req.path, 400, Date.now() - startTime, 0, validation.error)

      return c.json(
        {
          error: {
            type: 'validation_error',
            message: 'Invalid query parameters',
            details: validation.error,
          },
        },
        400
      )
    }

    const { domain, limit, offset } = validation.data
    const effectiveLimit = limit || 50
    const effectiveOffset = offset || 0

    // Search cache first
    const cachedPeople = await searchCachedPeopleByDomain(c.env.DB, domain, effectiveLimit + effectiveOffset)

    let people: any[] = []

    if (cachedPeople.length > 0) {
      // Use cached results
      people = cachedPeople.slice(effectiveOffset, effectiveOffset + effectiveLimit).map((person) => ({
        name: person.name,
        email: person.email,
        github_username: person.github?.username,
        confidence_score: person.confidence_score,
      }))
    } else {
      // Search R2 for GitHub profiles
      const profiles = await searchGitHubProfilesByDomain(c.env.DATA_BUCKET, domain, effectiveLimit + effectiveOffset)

      people = profiles.slice(effectiveOffset, effectiveOffset + effectiveLimit).map((profile) => ({
        name: profile.name || undefined,
        email: profile.email || undefined,
        github_username: profile.login,
        confidence_score: 0.7, // Default confidence for direct GitHub profile
      }))
    }

    // Calculate pagination info
    const total = cachedPeople.length > 0 ? cachedPeople.length : people.length
    const page = Math.floor(effectiveOffset / effectiveLimit) + 1
    const hasMore = total > effectiveOffset + effectiveLimit

    // Log usage (search uses 0 credits if cache hit, 1 credit if R2 query)
    const creditsUsed = cachedPeople.length > 0 ? 0 : 1
    await logUsage(c.env, apiKey, requestId, c.req.path, 200, Date.now() - startTime, creditsUsed, null)

    // Update credits used (if not a cache hit)
    if (creditsUsed > 0) {
      await c.env.DB.prepare('UPDATE api_keys SET credits_used = credits_used + ? WHERE id = ?')
        .bind(creditsUsed, apiKey.id)
        .run()
    }

    // Send analytics event
    c.env.ANALYTICS.writeDataPoint({
      blobs: [apiKey.id, apiKey.tier, 'search_people', domain],
      doubles: [people.length, Date.now() - startTime],
      indexes: [requestId],
    })

    const response: SearchPeopleResponse = {
      people,
      total,
      page,
      per_page: effectiveLimit,
      has_more: hasMore,
    }

    return c.json(response, 200)
  } catch (error) {
    console.error('Error searching people:', error)

    await logUsage(c.env, apiKey, requestId, c.req.path, 500, Date.now() - startTime, 0, error instanceof Error ? error.message : 'Unknown error')

    return c.json(
      {
        error: {
          type: 'internal_error',
          message: 'Failed to search people',
          details: error instanceof Error ? error.message : 'An unexpected error occurred',
          request_id: requestId,
        },
      },
      500
    )
  }
}

/**
 * Log API usage to database
 */
async function logUsage(
  env: Env,
  apiKey: ApiKey,
  requestId: string,
  endpoint: string,
  statusCode: number,
  responseTimeMs: number,
  creditsUsed: number,
  errorMessage: string | null
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO usage_logs (
        id, api_key_id, user_id, endpoint, method, request_id,
        response_status, response_time_ms, credits_used, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(crypto.randomUUID(), apiKey.id, apiKey.user_id, endpoint, 'GET', requestId, statusCode, responseTimeMs, creditsUsed, errorMessage)
      .run()
  } catch (error) {
    console.error('Failed to log usage:', error)
  }
}
