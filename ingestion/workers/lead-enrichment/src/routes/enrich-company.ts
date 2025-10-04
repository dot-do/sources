import type { Context } from 'hono'
import type { Env, ContextVariables, CompanyEnrichmentResponse, ApiKey } from '../types'
import { validateRequestBody, CompanyEnrichmentRequestSchema } from '../lib/validation'
import { enrichCompany } from '../enrichment/aggregator'

/**
 * POST /v1/enrich/company
 * Enrich a company with data from multiple sources
 */
export async function enrichCompanyRoute(c: Context<{ Bindings: Env; Variables: ContextVariables }>) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  const apiKey = c.get('api_key') as ApiKey

  try {
    // Validate request body
    const validation = await validateRequestBody(c.req.raw, CompanyEnrichmentRequestSchema)

    if (!validation.success) {
      await logUsage(c.env, apiKey, requestId, c.req.path, 400, Date.now() - startTime, 0, false, null, validation.error)

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

    // Enrich company
    const company = await enrichCompany(c.env.DATA_BUCKET, c.env.DB, request)

    // Determine credits used (1 credit per enrichment, unless cache hit)
    const creditsUsed = company.data_sources.includes('cache') ? 0 : 1

    // Log usage
    await logUsage(
      c.env,
      apiKey,
      requestId,
      c.req.path,
      200,
      Date.now() - startTime,
      creditsUsed,
      company.data_sources.includes('cache'),
      company.confidence_score,
      null,
      JSON.stringify(company.data_sources)
    )

    // Update credits used (if not a cache hit)
    if (creditsUsed > 0) {
      await c.env.DB.prepare('UPDATE api_keys SET credits_used = credits_used + ? WHERE id = ?')
        .bind(creditsUsed, apiKey.id)
        .run()
    }

    // Send analytics event
    c.env.ANALYTICS.writeDataPoint({
      blobs: [apiKey.id, apiKey.tier, 'company_enrichment'],
      doubles: [company.confidence_score, Date.now() - startTime],
      indexes: [requestId],
    })

    const response: CompanyEnrichmentResponse = {
      company,
    }

    return c.json(response, 200)
  } catch (error) {
    console.error('Error enriching company:', error)

    await logUsage(
      c.env,
      apiKey,
      requestId,
      c.req.path,
      500,
      Date.now() - startTime,
      0,
      false,
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )

    return c.json(
      {
        error: {
          type: 'internal_error',
          message: 'Failed to enrich company',
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
  cacheHit: boolean,
  confidenceScore: number | null,
  errorMessage: string | null,
  dataSources?: string
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO usage_logs (
        id, api_key_id, user_id, endpoint, method, request_id,
        response_status, response_time_ms, credits_used, cache_hit,
        confidence_score, data_sources, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        cacheHit ? 1 : 0,
        confidenceScore,
        dataSources || null,
        errorMessage
      )
      .run()
  } catch (error) {
    console.error('Failed to log usage:', error)
  }
}
