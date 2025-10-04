import type { D1Database } from '@cloudflare/workers-types'
import type { EnrichedPerson, EnrichedCompany, CacheEntry } from '../types'

/**
 * Cache layer for D1
 * Stores enriched data with 7-day TTL
 */

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

/**
 * Get cached person enrichment
 */
export async function getCachedPerson(db: D1Database, inputKey: string): Promise<EnrichedPerson | null> {
  const entry = await getCacheEntry(db, 'person', inputKey)

  if (!entry) {
    return null
  }

  try {
    const data = JSON.parse(entry.enriched_data) as EnrichedPerson
    return data
  } catch (error) {
    console.error('Error parsing cached person data:', error)
    return null
  }
}

/**
 * Get cached company enrichment
 */
export async function getCachedCompany(db: D1Database, inputKey: string): Promise<EnrichedCompany | null> {
  const entry = await getCacheEntry(db, 'company', inputKey)

  if (!entry) {
    return null
  }

  try {
    const data = JSON.parse(entry.enriched_data) as EnrichedCompany
    return data
  } catch (error) {
    console.error('Error parsing cached company data:', error)
    return null
  }
}

/**
 * Get cache entry from D1
 */
async function getCacheEntry(db: D1Database, type: 'person' | 'company', inputKey: string): Promise<CacheEntry | null> {
  try {
    const entry = await db
      .prepare('SELECT * FROM enrichment_cache WHERE type = ? AND input_key = ? AND expires_at > datetime("now") LIMIT 1')
      .bind(type, inputKey.toLowerCase())
      .first<CacheEntry>()

    if (!entry) {
      return null
    }

    // Update hit count and last accessed (async, don't await)
    db.prepare('UPDATE enrichment_cache SET hit_count = hit_count + 1, last_accessed_at = datetime("now") WHERE id = ?')
      .bind(entry.id)
      .run()
      .catch((error) => {
        console.error('Failed to update cache hit count:', error)
      })

    return entry
  } catch (error) {
    console.error('Error getting cache entry:', error)
    return null
  }
}

/**
 * Cache person enrichment
 */
export async function cachePerson(
  db: D1Database,
  inputKey: string,
  data: EnrichedPerson,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  const id = crypto.randomUUID()
  const enrichedData = JSON.stringify(data)
  const dataSources = JSON.stringify(data.data_sources)
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()

  try {
    await db
      .prepare(
        `INSERT INTO enrichment_cache (id, type, input_key, enriched_data, confidence_score, data_sources, expires_at, credits_used)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, 'person', inputKey.toLowerCase(), enrichedData, data.confidence_score, dataSources, expiresAt, 1)
      .run()
  } catch (error) {
    console.error('Error caching person enrichment:', error)
    throw error
  }
}

/**
 * Cache company enrichment
 */
export async function cacheCompany(
  db: D1Database,
  inputKey: string,
  data: EnrichedCompany,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  const id = crypto.randomUUID()
  const enrichedData = JSON.stringify(data)
  const dataSources = JSON.stringify(data.data_sources)
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()

  try {
    await db
      .prepare(
        `INSERT INTO enrichment_cache (id, type, input_key, enriched_data, confidence_score, data_sources, expires_at, credits_used)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, 'company', inputKey.toLowerCase(), enrichedData, data.confidence_score, dataSources, expiresAt, 1)
      .run()
  } catch (error) {
    console.error('Error caching company enrichment:', error)
    throw error
  }
}

/**
 * Invalidate cache entry
 */
export async function invalidateCache(db: D1Database, type: 'person' | 'company', inputKey: string): Promise<void> {
  try {
    await db
      .prepare('DELETE FROM enrichment_cache WHERE type = ? AND input_key = ?')
      .bind(type, inputKey.toLowerCase())
      .run()
  } catch (error) {
    console.error('Error invalidating cache:', error)
    throw error
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(db: D1Database): Promise<number> {
  try {
    const result = await db.prepare('DELETE FROM enrichment_cache WHERE expires_at < datetime("now")').run()

    return result.meta.changes || 0
  } catch (error) {
    console.error('Error cleaning up expired cache:', error)
    return 0
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(db: D1Database): Promise<{
  total_entries: number
  total_hits: number
  avg_confidence: number
  cache_size_mb: number
}> {
  try {
    const stats = await db
      .prepare(
        `SELECT
          COUNT(*) as total_entries,
          SUM(hit_count) as total_hits,
          AVG(confidence_score) as avg_confidence,
          SUM(LENGTH(enriched_data)) / 1024.0 / 1024.0 as cache_size_mb
        FROM enrichment_cache
        WHERE expires_at > datetime("now")`
      )
      .first<{
        total_entries: number
        total_hits: number
        avg_confidence: number
        cache_size_mb: number
      }>()

    return stats || { total_entries: 0, total_hits: 0, avg_confidence: 0, cache_size_mb: 0 }
  } catch (error) {
    console.error('Error getting cache stats:', error)
    return { total_entries: 0, total_hits: 0, avg_confidence: 0, cache_size_mb: 0 }
  }
}

/**
 * Search cached people by domain
 */
export async function searchCachedPeopleByDomain(db: D1Database, domain: string, limit: number = 50): Promise<EnrichedPerson[]> {
  try {
    const entries = await db
      .prepare(
        `SELECT enriched_data
         FROM enrichment_cache
         WHERE type = 'person'
           AND expires_at > datetime("now")
           AND enriched_data LIKE ?
         ORDER BY confidence_score DESC, updated_at DESC
         LIMIT ?`
      )
      .bind(`%"domain":"${domain.toLowerCase()}"%`, limit)
      .all<{ enriched_data: string }>()

    if (!entries.results) {
      return []
    }

    const people: EnrichedPerson[] = []
    for (const entry of entries.results) {
      try {
        const data = JSON.parse(entry.enriched_data) as EnrichedPerson
        people.push(data)
      } catch (error) {
        console.error('Error parsing cached person data:', error)
      }
    }

    return people
  } catch (error) {
    console.error('Error searching cached people by domain:', error)
    return []
  }
}

/**
 * Generate cache key from input
 */
export function generateCacheKey(input: { email?: string; domain?: string; github_username?: string }): string {
  if (input.email) {
    return `email:${input.email.toLowerCase()}`
  }
  if (input.github_username) {
    return `github:${input.github_username.toLowerCase()}`
  }
  if (input.domain) {
    return `domain:${input.domain.toLowerCase().replace(/^www\./, '')}`
  }
  throw new Error('Invalid input for cache key generation')
}
