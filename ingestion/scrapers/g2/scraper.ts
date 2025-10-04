/**
 * G2 Scraper - Scrapes software products from G2.com
 *
 * Approach:
 * 1. List products in category (paginated)
 * 2. Extract product URLs
 * 3. Scrape individual product pages
 * 4. Parse and validate data
 * 5. Queue for processing
 */

import { BaseScraper, ScraperConfig, ScraperEnv } from '../shared/base-scraper'
import { Product } from '../../schemas/product'
import { extractMeta, extractJsonLd, extractOpenGraph, cleanText, extractSchemaProduct } from '../shared/html-parser'
import { G2Category, getCategoriesForWorker } from './categories'

export interface G2ScraperOptions {
  categories?: string[] // Specific categories to scrape
  workerNumber?: number // Which worker (1-20)
  maxProductsPerCategory?: number
  skipExisting?: boolean
}

/**
 * G2 Scraper implementation
 */
export class G2Scraper extends BaseScraper {
  private readonly BASE_URL = 'https://www.g2.com'

  constructor(env: ScraperEnv, workerNumber = 1) {
    const config: ScraperConfig = {
      name: `g2-scraper-${String(workerNumber).padStart(2, '0')}`,
      version: '1.0.0',
      source: 'g2',
      rateLimit: {
        requestsPerSecond: 2, // Conservative for G2
        requestsPerMinute: 60,
      },
      retries: {
        maxAttempts: 3,
        backoffMs: 1000,
      },
    }

    super(config, env)
  }

  /**
   * Scrape products from G2
   */
  async scrape(options: G2ScraperOptions = {}): Promise<Product[]> {
    const products: Product[] = []

    // Determine which categories to scrape
    let categories: G2Category[]
    if (options.categories) {
      categories = options.categories.map(slug => ({ slug, name: slug, domain: 'unknown', priority: 5 }))
    } else if (options.workerNumber) {
      categories = getCategoriesForWorker(options.workerNumber)
    } else {
      categories = [{ slug: 'crm', name: 'CRM', domain: 'sales', priority: 10 }] // Default
    }

    console.log(`Scraping ${categories.length} categories:`, categories.map(c => c.slug).join(', '))

    // Scrape each category
    for (const category of categories) {
      try {
        const categoryProducts = await this.scrapeCategory(category, options.maxProductsPerCategory)
        products.push(...categoryProducts)
      } catch (error) {
        console.error(`Error scraping category ${category.slug}:`, error)
        this.metrics.errors++
      }
    }

    return products
  }

  /**
   * Scrape a single category
   */
  private async scrapeCategory(category: G2Category, maxProducts = 100): Promise<Product[]> {
    const products: Product[] = []
    const categoryUrl = `${this.BASE_URL}/categories/${category.slug}`

    console.log(`Scraping category: ${category.name} (${categoryUrl})`)

    // Get product listing page
    const response = await this.fetchWithRetry(categoryUrl)
    const html = await response.text()

    // Extract product URLs from listing
    const productUrls = this.extractProductUrls(html)

    console.log(`Found ${productUrls.length} products in ${category.slug}`)

    // Scrape each product (up to maxProducts)
    const urlsToScrape = productUrls.slice(0, maxProducts)

    for (const url of urlsToScrape) {
      try {
        const product = await this.scrapeProductPage(url, category)
        if (product) {
          products.push(product)
          await this.queueProduct(product)
          this.metrics.scraped++
        }
      } catch (error) {
        console.error(`Error scraping product ${url}:`, error)
        this.metrics.errors++
      }
    }

    return products
  }

  /**
   * Extract product URLs from category listing page
   */
  private extractProductUrls(html: string): string[] {
    const urls: string[] = []

    // G2 product URLs typically match: /products/{slug}/reviews
    const urlRegex = /href="(\/products\/[^\/]+\/reviews)"/g
    const matches = [...html.matchAll(urlRegex)]

    for (const match of matches) {
      const path = match[1]
      const fullUrl = `${this.BASE_URL}${path}`
      urls.push(fullUrl)
    }

    // Deduplicate
    return [...new Set(urls)]
  }

  /**
   * Scrape individual product page
   */
  private async scrapeProductPage(url: string, category: G2Category): Promise<Product | null> {
    console.log(`Scraping product: ${url}`)

    const response = await this.fetchWithRetry(url)
    const html = await response.text()

    // Save raw HTML for debugging
    const urlParts = url.split('/')
    const slug = urlParts[urlParts.length - 2]
    await this.saveRaw(`${category.slug}/${slug}`, { url, html: html.slice(0, 10000) })

    // Extract structured data
    const meta = extractMeta(html)
    const og = extractOpenGraph(html)
    const jsonLd = extractJsonLd(html)
    const schemaProduct = extractSchemaProduct(html)

    // Parse product data
    const productData = this.parseProductData(html, url, category, { meta, og, jsonLd, schemaProduct })

    // Validate and enrich
    const product = this.validateProduct(productData)

    return product
  }

  /**
   * Parse product data from HTML
   */
  private parseProductData(
    html: string,
    url: string,
    category: G2Category,
    structured: {
      meta: Record<string, string>
      og: Record<string, string>
      jsonLd: any[]
      schemaProduct: any
    }
  ): Partial<Product> {
    const { meta, og, jsonLd, schemaProduct } = structured

    // Extract product name
    const name = cleanText(
      og.title ||
      schemaProduct?.name ||
      meta['og:title'] ||
      this.extractByRegex(html, /<h1[^>]*>(.*?)<\/h1>/)
    )

    // Extract description
    const description = cleanText(
      og.description ||
      schemaProduct?.description ||
      meta.description ||
      this.extractByRegex(html, /<meta[^>]*name="description"[^>]*content="([^"]+)"/)
    )

    // Extract logo
    const logo = og.image || schemaProduct?.image

    // Extract rating/reviews
    const rating = schemaProduct?.aggregateRating?.ratingValue
    const reviewCount = schemaProduct?.aggregateRating?.reviewCount

    // Extract slug from URL
    const urlParts = url.split('/')
    const slug = urlParts[urlParts.length - 2]

    // Build product object
    return {
      source: 'g2',
      sourceId: slug,
      name,
      slug,
      url,
      category: category.name,
      subcategories: [category.slug],
      tags: [],
      tagline: og.description?.slice(0, 100),
      description,
      longDescription: this.extractLongDescription(html),
      pricing: this.extractPricing(html),
      features: this.extractFeatures(html),
      integrations: this.extractIntegrations(html),
      platforms: ['web'], // G2 doesn't always specify
      reviews: rating && reviewCount ? [{
        count: parseInt(reviewCount) || 0,
        rating: parseFloat(rating) || 0,
        source: 'g2',
        url,
      }] : [],
      logo,
      screenshots: this.extractScreenshots(html),
      vendor: this.extractVendor(html),
    }
  }

  /**
   * Extract text by regex pattern
   */
  private extractByRegex(html: string, pattern: RegExp): string {
    const match = html.match(pattern)
    return match ? cleanText(match[1]) : ''
  }

  /**
   * Extract long description
   */
  private extractLongDescription(html: string): string {
    // G2 typically has a description section
    const match = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    return match ? cleanText(match[1]).slice(0, 2000) : ''
  }

  /**
   * Extract pricing information
   */
  private extractPricing(html: string): Product['pricing'] {
    // G2 shows starting price in various formats
    const priceMatch = html.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)(?:\/| per )(month|year|user)/i)

    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(',', ''))
      const period = priceMatch[2].toLowerCase()

      return {
        model: 'subscription',
        startingPrice: price,
        currency: 'USD',
        tiers: [{
          name: 'Starting',
          price,
          features: [],
          billingPeriod: period === 'year' ? 'annual' : 'monthly',
        }],
      }
    }

    // Check for "Free" or "Free Trial"
    if (html.includes('Free Trial') || html.includes('Free Plan')) {
      return {
        model: 'freemium',
        currency: 'USD',
        freeTrialDays: 14, // Default assumption
      }
    }

    return undefined
  }

  /**
   * Extract features list
   */
  private extractFeatures(html: string): string[] {
    const features: string[] = []

    // G2 has various feature list formats
    const featureMatches = html.matchAll(/<li[^>]*class="[^"]*feature[^"]*"[^>]*>(.*?)<\/li>/gi)

    for (const match of featureMatches) {
      const feature = cleanText(match[1])
      if (feature && feature.length > 3) {
        features.push(feature)
      }
    }

    return [...new Set(features)].slice(0, 20) // Dedupe and limit
  }

  /**
   * Extract integrations
   */
  private extractIntegrations(html: string): string[] {
    const integrations: string[] = []

    // Look for integration mentions
    const integrationMatches = html.matchAll(/integrates with ([A-Z][a-zA-Z\s]+)/g)

    for (const match of integrationMatches) {
      const integration = cleanText(match[1])
      if (integration && integration.length > 2) {
        integrations.push(integration)
      }
    }

    return [...new Set(integrations)].slice(0, 50)
  }

  /**
   * Extract screenshots
   */
  private extractScreenshots(html: string): string[] {
    const screenshots: string[] = []

    // G2 screenshot images
    const imgMatches = html.matchAll(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*screenshot[^"]*"/gi)

    for (const match of imgMatches) {
      screenshots.push(match[1])
    }

    return screenshots.slice(0, 10)
  }

  /**
   * Extract vendor information
   */
  private extractVendor(html: string): Product['vendor'] {
    // Extract vendor name
    const vendorMatch = html.match(/by ([A-Z][a-zA-Z\s,\.]+)/)
    const name = vendorMatch ? cleanText(vendorMatch[1]) : undefined

    if (!name) return undefined

    return {
      name,
      // Additional vendor fields would be scraped from vendor page
    }
  }

  /**
   * Scrape single product by slug
   */
  async scrapeSingle(slug: string): Promise<Product | null> {
    const url = `${this.BASE_URL}/products/${slug}/reviews`
    const category: G2Category = { slug: 'unknown', name: 'Unknown', domain: 'unknown', priority: 5 }

    return await this.scrapeProductPage(url, category)
  }
}

/**
 * Worker export for Cloudflare Workers
 */
export default {
  async fetch(request: Request, env: ScraperEnv): Promise<Response> {
    const url = new URL(request.url)
    const startTime = Date.now()

    try {
      // Parse options from query params
      const workerNumber = parseInt(url.searchParams.get('worker') || '1')
      const categories = url.searchParams.get('categories')?.split(',')
      const maxProductsPerCategory = parseInt(url.searchParams.get('limit') || '100')

      const scraper = new G2Scraper(env, workerNumber)

      if (url.pathname === '/scrape') {
        await scraper.scrape({
          workerNumber,
          categories,
          maxProductsPerCategory,
        })

        return new Response(JSON.stringify({
          success: true,
          metrics: scraper.getMetrics(),
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.pathname === '/product') {
        const slug = url.searchParams.get('slug')
        if (!slug) {
          return new Response('Missing slug parameter', { status: 400 })
        }

        const product = await scraper.scrapeSingle(slug)

        return new Response(JSON.stringify({
          success: !!product,
          product,
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.pathname === '/status') {
        return new Response(JSON.stringify({
          scraper: 'g2',
          worker: workerNumber,
          metrics: scraper.getMetrics(),
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        scraper: 'g2-scraper',
        endpoints: {
          '/scrape?worker=1&limit=100': 'Scrape products',
          '/product?slug=salesforce': 'Scrape single product',
          '/status': 'Get scraper status',
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      })

    } catch (error) {
      console.error('G2 scraper error:', error)
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
    // Get worker number from environment
    const workerNumber = parseInt(env.KV.get('WORKER_NUMBER') || '1')

    const scraper = new G2Scraper(env, workerNumber)

    await scraper.scrape({
      workerNumber,
      maxProductsPerCategory: 1000, // Full scrape
    })

    console.log('G2 scheduled scrape complete:', scraper.getMetrics())
  },
}
