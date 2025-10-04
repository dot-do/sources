import type { Context } from 'hono'
import type { Env, ContextVariables, StatusResponse, ApiKey } from '../types'

/**
 * GET /v1/status
 * Get API status and data source health
 */
export async function statusRoute(c: Context<{ Bindings: Env; Variables: ContextVariables }>) {
  const apiKey = c.get('api_key') as ApiKey

  try {
    // Get system status from database
    const systemStatus = await c.env.DB.prepare('SELECT * FROM system_status').all()

    // Get data source health
    const dataSources = await c.env.DB.prepare('SELECT * FROM data_source_health').all()

    // Get cache stats
    const cacheStats = await c.env.DB.prepare(
      `SELECT
        COUNT(*) as total_entries,
        SUM(hit_count) as total_hits,
        AVG(confidence_score) as avg_confidence
      FROM enrichment_cache
      WHERE expires_at > datetime("now")`
    ).first<{
      total_entries: number
      total_hits: number
      avg_confidence: number
    }>()

    // Build data sources object
    const dataSourcesMap: any = {}
    if (dataSources.results) {
      for (const source of dataSources.results as any[]) {
        dataSourcesMap[source.source] = {
          status: source.status,
          last_update: source.last_update || source.last_check,
          records: source.total_records || undefined,
        }
      }
    }

    // Get API version from system_status
    const versionEntry = systemStatus.results?.find((s: any) => s.key === 'version')
    const version = versionEntry ? (versionEntry as any).value : '1.0.0'

    // Calculate uptime (time since last_deployment)
    const deploymentEntry = systemStatus.results?.find((s: any) => s.key === 'last_deployment')
    const lastDeployment = deploymentEntry ? new Date((deploymentEntry as any).value).getTime() : Date.now()
    const uptime = Math.floor((Date.now() - lastDeployment) / 1000) // in seconds

    const response: StatusResponse = {
      status: 'operational',
      version,
      uptime,
      data_sources: dataSourcesMap,
      rate_limits: {
        requests_per_minute: apiKey.rate_limit_rpm,
        requests_per_day: apiKey.rate_limit_rpd,
      },
    }

    return c.json(response, 200)
  } catch (error) {
    console.error('Error getting status:', error)

    return c.json(
      {
        error: {
          type: 'internal_error',
          message: 'Failed to get API status',
          details: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      500
    )
  }
}
