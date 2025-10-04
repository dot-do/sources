/**
 * Hacker News Scraper - Uses Algolia HN Search API
 *
 * API Docs: https://hn.algolia.com/api
 *
 * Scrapes:
 * - Show HN posts (product launches)
 * - Who is Hiring mentions (job postings with software mentions)
 * - Front page stories with software/tool references
 */

import { BaseScraper, ScraperConfig, ScraperEnv } from '../shared/base-scraper'
import { Product } from '../../schemas/product'

export interface HackerNewsScraperOptions {
  type?: 'show_hn' | 'hiring' | 'front_page'
  limit?: number
  daysBack?: number
}

interface HNHit {
  objectID: string
  title: string
  url?: string
  author: string
  created_at: string
  created_at_i: number
  points: number
  num_comments: number
  story_text?: string
  comment_text?: string
  _tags: string[]
}

/**
 * Hacker News Scraper
 */
export class HackerNewsScraper extends BaseScraper {
  private readonly API_URL = 'https://hn.algolia.com/api/v1'
  private readonly BASE_URL = 'https://news.ycombinator.com'

  constructor(env: ScraperEnv) {
    const config: ScraperConfig = {
      name: 'hackernews-scraper',
      version: '1.0.0',
      source: 'hackernews',
      rateLimit: {
        requestsPerSecond: 10, // Algolia API is generous
        requestsPerMinute: 200,
      },
      retries: {
        maxAttempts: 3,
        backoffMs: 500,
      },
    }

    super(config, env)
  }

  /**
   * Scrape Hacker News
   */
  async scrape(options: HackerNewsScraperOptions = {}): Promise<Product[]> {
    const type = options.type || 'show_hn'
    const limit = options.limit || 100
    const daysBack = options.daysBack || 30

    const products: Product[] = []

    if (type === 'show_hn') {
      const showHnProducts = await this.scrapeShowHN(limit, daysBack)
      products.push(...showHnProducts)
    }

    if (type === 'hiring') {
      // Who is Hiring posts mention many tools/products
      const hiringProducts = await this.scrapeHiring(limit, daysBack)
      products.push(...hiringProducts)
    }

    if (type === 'front_page') {
      const frontPageProducts = await this.scrapeFrontPage(limit)
      products.push(...frontPageProducts)
    }

    return products
  }

  /**
   * Scrape Show HN posts
   */
  private async scrapeShowHN(limit: number, daysBack: number): Promise<Product[]> {
    const products: Product[] = []
    const sinceTimestamp = Math.floor(Date.now() / 1000) - (daysBack * 86400)

    let page = 0
    let fetched = 0

    while (fetched < limit) {
      try {
        const query = `show_hn`
        const url = `${this.API_URL}/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i>${sinceTimestamp}&page=${page}&hitsPerPage=50`

        const response = await this.fetchWithRetry(url)
        const data = await response.json() as { hits: HNHit[]; nbPages: number }

        if (data.hits.length === 0) break

        for (const hit of data.hits) {
          const product = this.parseShowHN(hit)
          if (product) {
            products.push(product)
            await this.queueProduct(product)
            this.metrics.scraped++
            fetched++

            if (fetched >= limit) break
          }
        }

        page++
        if (page >= data.nbPages) break

      } catch (error) {
        console.error('Error scraping Show HN:', error)
        this.metrics.errors++
        break
      }
    }

    return products
  }

  /**
   * Scrape Who is Hiring posts for software mentions
   */
  private async scrapeHiring(limit: number, daysBack: number): Promise<Product[]> {
    // Implementation would parse "Who is Hiring" thread comments
    // for software/tool mentions (e.g., "using Python, PostgreSQL, AWS")
    // This is more complex as it requires NLP/pattern matching
    return []
  }

  /**
   * Scrape front page for software links
   */
  private async scrapeFrontPage(limit: number): Promise<Product[]> {
    const products: Product[] = []

    try {
      const url = `${this.API_URL}/search?tags=front_page&hitsPerPage=${limit}`
      const response = await this.fetchWithRetry(url)
      const data = await response.json() as { hits: HNHit[] }

      for (const hit of data.hits) {
        // Only process if URL points to a product/tool
        if (hit.url && this.isProductUrl(hit.url)) {
          const product = this.parseStory(hit)
          if (product) {
            products.push(product)
            await this.queueProduct(product)
            this.metrics.scraped++
          }
        }
      }
    } catch (error) {
      console.error('Error scraping front page:', error)
      this.metrics.errors++
    }

    return products
  }

  /**
   * Parse Show HN post into Product
   */
  private parseShowHN(hit: HNHit): Product | null {
    try {
      // Extract product name from title
      // Typical format: "Show HN: ProductName – Description"
      const titleMatch = hit.title.match(/Show HN:\s*([^–\-]+)/i)
      const name = titleMatch ? titleMatch[1].trim() : hit.title.replace(/Show HN:\s*/i, '').trim()

      // Generate slug
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      // Extract description (after – or -)
      const descMatch = hit.title.match(/[–\-]\s*(.+)$/)
      const tagline = descMatch ? descMatch[1].trim() : ''

      const product: Partial<Product> = {
        source: 'hackernews',
        sourceId: hit.objectID,
        name,
        slug,
        url: hit.url || `${this.BASE_URL}/item?id=${hit.objectID}`,
        category: 'Unknown', // HN doesn't categorize
        tags: this.extractTags(hit.title, hit.story_text || ''),
        tagline,
        description: hit.story_text || tagline,
        features: [],
        integrations: [],
        platforms: this.detectPlatforms(hit.title, hit.story_text || ''),
        reviews: [{
          count: hit.num_comments,
          rating: Math.min(5, hit.points / 100), // Rough conversion
          source: 'hackernews',
          url: `${this.BASE_URL}/item?id=${hit.objectID}`,
        }],
        isTrending: hit.points > 100,
      }

      return this.validateProduct(product)
    } catch (error) {
      console.error('Error parsing Show HN:', error)
      this.metrics.errors++
      return null
    }
  }

  /**
   * Parse story into Product (for front page)
   */
  private parseStory(hit: HNHit): Product | null {
    // Similar to parseShowHN but less structured
    return this.parseShowHN(hit) // Reuse for now
  }

  /**
   * Check if URL likely points to a product/tool
   */
  private isProductUrl(url: string): boolean {
    const productDomains = ['github.com', 'gitlab.com', 'producthunt.com']
    const domain = new URL(url).hostname

    return productDomains.some(pd => domain.includes(pd)) ||
           url.includes('/product') ||
           url.includes('/tool')
  }

  /**
   * Extract tags from text
   */
  private extractTags(title: string, text: string): string[] {
    const combined = `${title} ${text}`.toLowerCase()
    const tags: string[] = []

    // Common technology keywords
    const keywords = ['ai', 'ml', 'devops', 'cloud', 'saas', 'api', 'open source', 'react', 'vue', 'python', 'node', 'typescript', 'rust', 'go']

    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        tags.push(keyword)
      }
    }

    return tags
  }

  /**
   * Detect platforms from text
   */
  private detectPlatforms(title: string, text: string): string[] {
    const combined = `${title} ${text}`.toLowerCase()
    const platforms: string[] = []

    if (combined.includes('web') || combined.includes('browser')) platforms.push('web')
    if (combined.includes('ios') || combined.includes('iphone')) platforms.push('ios')
    if (combined.includes('android')) platforms.push('android')
    if (combined.includes('mac') || combined.includes('macos')) platforms.push('mac')
    if (combined.includes('windows')) platforms.push('windows')
    if (combined.includes('linux')) platforms.push('linux')

    return platforms.length > 0 ? platforms : ['web'] // Default to web
  }

  /**
   * Scrape single item by ID
   */
  async scrapeSingle(id: string): Promise<Product | null> {
    try {
      const url = `${this.API_URL}/items/${id}`
      const response = await this.fetchWithRetry(url)
      const hit = await response.json() as HNHit

      return this.parseShowHN(hit)
    } catch (error) {
      console.error(`Error scraping HN item ${id}:`, error)
      this.metrics.errors++
      return null
    }
  }
}

/**
 * Worker export
 */
export default {
  async fetch(request: Request, env: ScraperEnv): Promise<Response> {
    const url = new URL(request.url)

    try {
      const scraper = new HackerNewsScraper(env)

      if (url.pathname === '/scrape') {
        const type = url.searchParams.get('type') as 'show_hn' | 'hiring' | 'front_page' || 'show_hn'
        const limit = parseInt(url.searchParams.get('limit') || '100')
        const daysBack = parseInt(url.searchParams.get('days') || '30')

        await scraper.scrape({ type, limit, daysBack })

        return new Response(JSON.stringify({
          success: true,
          metrics: scraper.getMetrics(),
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.pathname === '/item') {
        const id = url.searchParams.get('id')
        if (!id) {
          return new Response('Missing id parameter', { status: 400 })
        }

        const product = await scraper.scrapeSingle(id)

        return new Response(JSON.stringify({
          success: !!product,
          product,
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        scraper: 'hackernews-scraper',
        endpoints: {
          '/scrape?type=show_hn&limit=100&days=30': 'Scrape Show HN posts',
          '/item?id=12345': 'Scrape single HN item',
          '/status': 'Get scraper status',
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      })

    } catch (error) {
      console.error('Hacker News scraper error:', error)
      return new Response(JSON.stringify({
        error: error.message,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },

  /**
   * Scheduled trigger - runs daily
   */
  async scheduled(event: ScheduledEvent, env: ScraperEnv): Promise<void> {
    const scraper = new HackerNewsScraper(env)

    // Scrape Show HN posts from last 7 days
    await scraper.scrape({ type: 'show_hn', limit: 100, daysBack: 7 })

    console.log('Hacker News scheduled scrape complete:', scraper.getMetrics())
  },
}
