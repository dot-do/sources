import type { Context } from 'hono'
import type { Env, ContextVariables, BulkEnrichmentResponse, ApiKey, EnrichedPerson, EnrichedCompany } from '../types'
import { validateRequestBody, BulkEnrichmentRequestSchema } from '../lib/validation'
import { enrichPerson, enrichCompany } from '../enrichment/aggregator'

/**
 * POST /v1/enrich/bulk
 * Bulk enrichment for up to 100 items
 */
export async function enrichBulkRoute(c: Context<{ Bindings: Env; Variables: ContextVariables }>) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  const apiKey = c.get('api_key') as ApiKey

  try {
    // Validate request body
    const validation = await validateRequestBody(c.req.raw, BulkEnrichmentRequestSchema)

    if (!validation.success) {
      await logUsage(c.env, apiKey, requestId, c.req.path, 400, Date.now() - startTime, 0, 0, validation.error)

      return c.json(
        {
          error: {
            type: 'validation_error',
            message: 'Invalid request data',
            details: validation.error,
          },
        },
        400
      )
    }

    const request = validation.data

    // Process enrichments in parallel
    const results = await Promise.all(
      request.items.map(async (item) => {
        try {
          if (request.type === 'person') {
            const person = await enrichPerson(c.env.DATA_BUCKET, c.env.DB, item as any)
            return {
              input: item,
              person,
              status: 'success' as const,
            }
          } else {
            const company = await enrichCompany(c.env.DATA_BUCKET, c.env.DB, item as any)
            return {
              input: item,
              company,
              status: 'success' as const,
            }
          }
        } catch (error) {
          return {
            input: item,
            status: 'failed' as const,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      })
    )

    // Calculate summary
    const successful = results.filter((r) => r.status === 'success').length
    const failed = results.filter((r) => r.status === 'failed').length

    // Calculate total credits used
    // Cache hits don't use credits, non-cache hits use 1 credit
    let totalCreditsUsed = 0
    for (const result of results) {
      if (result.status === 'success') {
        const dataSources = request.type === 'person' ? result.person?.data_sources : result.company?.data_sources
        if (dataSources && !dataSources.includes('cache')) {
          totalCreditsUsed += 1
        }
      }
    }

    // Log usage
    await logUsage(c.env, apiKey, requestId, c.req.path, 200, Date.now() - startTime, totalCreditsUsed, results.length, null)

    // Update credits used
    if (totalCreditsUsed > 0) {
      await c.env.DB.prepare('UPDATE api_keys SET credits_used = credits_used + ? WHERE id = ?')
        .bind(totalCreditsUsed, apiKey.id)
        .run()
    }

    // Send analytics event
    c.env.ANALYTICS.writeDataPoint({
      blobs: [apiKey.id, apiKey.tier, 'bulk_enrichment', request.type],
      doubles: [results.length, totalCreditsUsed, Date.now() - startTime],
      indexes: [requestId],
    })

    const response: BulkEnrichmentResponse = {
      results,
      summary: {
        total: results.length,
        successful,
        failed,
        credits_used: totalCreditsUsed,
      },
    }

    return c.json(response, 200)
  } catch (error) {
    console.error('Error in bulk enrichment:', error)

    await logUsage(c.env, apiKey, requestId, c.req.path, 500, Date.now() - startTime, 0, 0, error instanceof Error ? error.message : 'Unknown error')

    return c.json(
      {
        error: {
          type: 'internal_error',
          message: 'Failed to process bulk enrichment',
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
  itemCount: number,
  errorMessage: string | null
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO usage_logs (
        id, api_key_id, user_id, endpoint, method, request_id,
        response_status, response_time_ms, credits_used, error_message,
        input_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        apiKey.id,
        apiKey.user_id,
        endpoint,
        'POST',
        requestId,
        statusCode,
        responseTimeMs,
        creditsUsed,
        errorMessage,
        JSON.stringify({ item_count: itemCount })
      )
      .run()
  } catch (error) {
    console.error('Failed to log usage:', error)
  }
}
