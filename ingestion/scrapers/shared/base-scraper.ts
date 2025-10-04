/**
 * Base Scraper - Shared utilities for all software product scrapers
 *
 * Provides common functionality:
 * - Rate limiting
 * - Error handling
 * - Queue publishing
 * - Retry logic
 * - Data validation
 */

import { Product, ProductSchema, ScrapingQueueMessage } from '../../schemas/product'
import { v4 as uuidv4 } from 'uuid'

export interface ScraperEnv {
  // Storage
  DB: D1Database
  RAW_BUCKET: R2Bucket
  KV: KVNamespace

  // Queue
  INGESTION_QUEUE: Queue<ScrapingQueueMessage>

  // Analytics
  ANALYTICS?: AnalyticsEngineDataset

  // Secrets (optional)
  PROXY_URL?: string
  USER_AGENT?: string
}

export interface ScraperConfig {
  name: string
  version: string
  source: Product['source']
  rateLimit: {
    requestsPerSecond: number
    requestsPerMinute: number
  }
  retries: {
    maxAttempts: number
    backoffMs: number
  }
}

export interface ScraperMetrics {
  scraped: number
  queued: number
  errors: number
  startTime: number
  lastUpdate: number
}

/**
 * Base scraper class with common functionality
 */
export abstract class BaseScraper {
  protected config: ScraperConfig
  protected env: ScraperEnv
  protected metrics: ScraperMetrics

  constructor(config: ScraperConfig, env: ScraperEnv) {
    this.config = config
    this.env = env
    this.metrics = {
      scraped: 0,
      queued: 0,
      errors: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    }
  }

  /**
   * Rate limiter - ensures we don't exceed limits
   */
  protected async rateLimit(): Promise<void> {
    const key = `ratelimit:${this.config.source}`

    // Check per-second limit
    const secondKey = `${key}:second:${Math.floor(Date.now() / 1000)}`
    const secondCount = parseInt((await this.env.KV.get(secondKey)) || '0')

    if (secondCount >= this.config.rateLimit.requestsPerSecond) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Check per-minute limit
    const minuteKey = `${key}:minute:${Math.floor(Date.now() / 60000)}`
    const minuteCount = parseInt((await this.env.KV.get(minuteKey)) || '0')

    if (minuteCount >= this.config.rateLimit.requestsPerMinute) {
      const waitMs = 60000 - (Date.now() % 60000)
      await new Promise(resolve => setTimeout(resolve, waitMs))
    }

    // Increment counters
    await this.env.KV.put(secondKey, String(secondCount + 1), { expirationTtl: 2 })
    await this.env.KV.put(minuteKey, String(minuteCount + 1), { expirationTtl: 120 })
  }

  /**
   * Fetch with retry logic
   */
  protected async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.config.retries.maxAttempts; attempt++) {
      try {
        await this.rateLimit()

        const headers = new Headers(options.headers)
        if (!headers.has('User-Agent')) {
          headers.set('User-Agent', this.env.USER_AGENT || 'Mozilla/5.0 (compatible; DataIngestionBot/1.0)')
        }

        const response = await fetch(url, { ...options, headers })

        // Retry on 429 (rate limit) or 5xx errors
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response
      } catch (error) {
        lastError = error as Error
        console.warn(`Fetch attempt ${attempt + 1} failed for ${url}:`, error)

        if (attempt < this.config.retries.maxAttempts - 1) {
          const backoff = this.config.retries.backoffMs * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, backoff))
        }
      }
    }

    throw lastError || new Error('Fetch failed after retries')
  }

  /**
   * Validate and enrich product data
   */
  protected validateProduct(data: Partial<Product>): Product | null {
    try {
      // Add scraping metadata
      const enriched = {
        ...data,
        id: data.id || uuidv4(),
        scrapedAt: new Date().toISOString(),
        scrapedBy: this.config.name,
        scrapedVersion: this.config.version,
        completeness: this.calculateCompleteness(data),
        confidence: 90, // Default confidence
        validationErrors: [],
      }

      // Validate against schema
      const validated = ProductSchema.parse(enriched)
      return validated
    } catch (error) {
      console.error('Product validation failed:', error)
      this.metrics.errors++
      return null
    }
  }

  /**
   * Calculate data completeness score
   */
  protected calculateCompleteness(product: Partial<Product>): number {
    const fields = [
      'name',
      'description',
      'longDescription',
      'tagline',
      'category',
      'pricing',
      'features',
      'logo',
      'screenshots',
      'vendor',
      'reviews',
    ]

    let score = 0
    for (const field of fields) {
      if (product[field as keyof Product]) {
        const value = product[field as keyof Product]
        if (Array.isArray(value)) {
          score += value.length > 0 ? 1 : 0
        } else if (typeof value === 'object') {
          score += Object.keys(value as object).length > 0 ? 1 : 0
        } else {
          score += 1
        }
      }
    }

    return Math.round((score / fields.length) * 100)
  }

  /**
   * Queue product for processing
   */
  protected async queueProduct(product: Product): Promise<void> {
    try {
      await this.env.INGESTION_QUEUE.send({
        messageId: uuidv4(),
        source: this.config.source,
        category: product.category,
        productUrl: product.url,
        productId: product.id,
        priority: 5,
        retryCount: 0,
        metadata: {
          product,
        },
      })

      this.metrics.queued++
      this.metrics.lastUpdate = Date.now()
    } catch (error) {
      console.error('Failed to queue product:', error)
      this.metrics.errors++
      throw error
    }
  }

  /**
   * Save raw response to R2 for debugging
   */
  protected async saveRaw(key: string, data: unknown): Promise<void> {
    try {
      const path = `raw/${this.config.source}/${new Date().toISOString().split('T')[0]}/${key}.json`
      await this.env.RAW_BUCKET.put(path, JSON.stringify(data, null, 2))
    } catch (error) {
      console.warn('Failed to save raw data:', error)
      // Non-fatal error
    }
  }

  /**
   * Track metrics in Analytics Engine
   */
  protected async trackMetrics(): Promise<void> {
    if (!this.env.ANALYTICS) return

    try {
      this.env.ANALYTICS.writeDataPoint({
        blobs: [this.config.name, this.config.source],
        doubles: [this.metrics.scraped, this.metrics.queued, this.metrics.errors],
        indexes: [this.config.source],
      })
    } catch (error) {
      console.warn('Failed to track metrics:', error)
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): ScraperMetrics & { source: string; uptime: number } {
    return {
      ...this.metrics,
      source: this.config.source,
      uptime: Date.now() - this.metrics.startTime,
    }
  }

  /**
   * Abstract method - implement in subclass
   */
  abstract scrape(options?: unknown): Promise<Product[]>

  /**
   * Abstract method - scrape single item
   */
  abstract scrapeSingle(id: string): Promise<Product | null>
}

/**
 * Scraper response wrapper
 */
export interface ScraperResponse {
  success: boolean
  scraped: number
  queued: number
  errors: number
  duration: number
  metrics: ReturnType<BaseScraper['getMetrics']>
  error?: string
}

/**
 * Create standard response
 */
export function createResponse(
  scraper: BaseScraper,
  startTime: number,
  error?: Error
): Response {
  const metrics = scraper.getMetrics()
  const duration = Date.now() - startTime

  const response: ScraperResponse = {
    success: !error && metrics.errors === 0,
    scraped: metrics.scraped,
    queued: metrics.queued,
    errors: metrics.errors,
    duration,
    metrics,
    error: error?.message,
  }

  return Response.json(response, {
    status: error ? 500 : 200,
  })
}
