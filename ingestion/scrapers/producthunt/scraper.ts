/**
 * Product Hunt Scraper - Uses Product Hunt GraphQL API
 *
 * API Docs: https://api.producthunt.com/v2/docs
 * Authentication: OAuth 2.0 or API token
 *
 * Scrapes:
 * - Daily trending products
 * - Weekly/monthly trending
 * - Products by topic (AI, DevTools, SaaS, etc.)
 * - Product details with votes, comments, makers
 */

import { BaseScraper, ScraperConfig, ScraperEnv } from '../shared/base-scraper'
import { Product } from '../../schemas/product'

export interface ProductHuntScraperOptions {
  timeframe?: 'daily' | 'weekly' | 'monthly'
  topics?: string[]
  limit?: number
}

/**
 * Product Hunt GraphQL queries
 */
const QUERIES = {
  /**
   * Get trending products
   */
  trending: `
    query GetPosts($first: Int!, $after: String, $order: PostsOrder) {
      posts(first: $first, after: $after, order: $order) {
        edges {
          node {
            id
            name
            tagline
            description
            url
            website
            votesCount
            commentsCount
            createdAt
            featuredAt
            thumbnail {
              url
            }
            screenshots {
              url
            }
            topics {
              edges {
                node {
                  name
                  slug
                }
              }
            }
            makers {
              edges {
                node {
                  name
                  username
                  headline
                }
              }
            }
            hunter {
              name
              username
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,

  /**
   * Get single product details
   */
  product: `
    query GetPost($id: ID!) {
      post(id: $id) {
        id
        name
        tagline
        description
        url
        website
        votesCount
        commentsCount
        createdAt
        featuredAt
        thumbnail {
          url
        }
        screenshots {
          url
        }
        topics {
          edges {
            node {
              name
              slug
            }
          }
        }
        makers {
          edges {
            node {
              name
              username
              headline
              websiteUrl
            }
          }
        }
        hunter {
          name
          username
        }
        pricing: pricingType
        reviewsRating
      }
    }
  `,
}

interface ProductHuntPost {
  id: string
  name: string
  tagline: string
  description: string
  url: string
  website?: string
  votesCount: number
  commentsCount: number
  createdAt: string
  featuredAt?: string
  thumbnail?: { url: string }
  screenshots?: Array<{ url: string }>
  topics?: {
    edges: Array<{
      node: { name: string; slug: string }
    }>
  }
  makers?: {
    edges: Array<{
      node: { name: string; username: string; headline?: string; websiteUrl?: string }
    }>
  }
  hunter?: { name: string; username: string }
  pricing?: string
  reviewsRating?: number
}

/**
 * Product Hunt Scraper
 */
export class ProductHuntScraper extends BaseScraper {
  private readonly API_URL = 'https://api.producthunt.com/v2/api/graphql'
  private readonly BASE_URL = 'https://www.producthunt.com'

  constructor(env: ScraperEnv) {
    const config: ScraperConfig = {
      name: 'producthunt-scraper',
      version: '1.0.0',
      source: 'producthunt',
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 100,
      },
      retries: {
        maxAttempts: 3,
        backoffMs: 1000,
      },
    }

    super(config, env)
  }

  /**
   * Execute GraphQL query
   */
  private async query<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
    const response = await this.fetchWithRetry(this.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.env.PRODUCTHUNT_API_TOKEN || ''}`,
      },
      body: JSON.stringify({ query, variables }),
    })

    const json = await response.json() as { data: T; errors?: any[] }

    if (json.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`)
    }

    return json.data
  }

  /**
   * Scrape trending products
   */
  async scrape(options: ProductHuntScraperOptions = {}): Promise<Product[]> {
    const products: Product[] = []
    const limit = options.limit || 100

    // Determine order based on timeframe
    const order = options.timeframe === 'weekly' ? 'VOTES_LAST_WEEK' :
                  options.timeframe === 'monthly' ? 'VOTES_LAST_MONTH' :
                  'VOTES' // daily/default

    let hasNextPage = true
    let after: string | null = null
    let fetched = 0

    while (hasNextPage && fetched < limit) {
      try {
        const data = await this.query<{
          posts: {
            edges: Array<{ node: ProductHuntPost }>
            pageInfo: { hasNextPage: boolean; endCursor: string }
          }
        }>(QUERIES.trending, {
          first: Math.min(50, limit - fetched),
          after,
          order,
        })

        const posts = data.posts.edges.map(edge => edge.node)

        for (const post of posts) {
          const product = this.parseProduct(post)
          if (product) {
            products.push(product)
            await this.queueProduct(product)
            this.metrics.scraped++
            fetched++
          }
        }

        hasNextPage = data.posts.pageInfo.hasNextPage
        after = data.posts.pageInfo.endCursor

      } catch (error) {
        console.error('Error fetching trending products:', error)
        this.metrics.errors++
        break
      }
    }

    return products
  }

  /**
   * Scrape single product by ID
   */
  async scrapeSingle(id: string): Promise<Product | null> {
    try {
      const data = await this.query<{ post: ProductHuntPost }>(QUERIES.product, { id })
      return this.parseProduct(data.post)
    } catch (error) {
      console.error(`Error scraping product ${id}:`, error)
      this.metrics.errors++
      return null
    }
  }

  /**
   * Parse Product Hunt post into Product schema
   */
  private parseProduct(post: ProductHuntPost): Product | null {
    try {
      // Generate slug from name
      const slug = post.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      // Extract topics/tags
      const topics = post.topics?.edges.map(e => e.node.name) || []
      const topicSlugs = post.topics?.edges.map(e => e.node.slug) || []

      // Determine category (primary topic)
      const category = topics[0] || 'Unknown'

      // Extract maker information
      const makers = post.makers?.edges.map(e => e.node) || []
      const makerNames = makers.map(m => m.name)

      // Build vendor info from first maker
      const firstMaker = makers[0]
      const vendor = firstMaker ? {
        name: firstMaker.name,
        website: firstMaker.websiteUrl,
      } : undefined

      // Parse pricing
      const pricing = post.pricing ? this.parsePricing(post.pricing) : undefined

      const product: Partial<Product> = {
        source: 'producthunt',
        sourceId: post.id,
        name: post.name,
        slug,
        url: `${this.BASE_URL}/posts/${slug}`,
        category,
        subcategories: topicSlugs,
        tags: topics,
        tagline: post.tagline,
        description: post.description,
        pricing,
        features: [], // Product Hunt doesn't provide detailed features
        integrations: [],
        platforms: ['web'], // Assumption
        reviews: post.reviewsRating ? [{
          count: post.commentsCount || 0,
          rating: post.reviewsRating,
          source: 'producthunt',
          url: `${this.BASE_URL}/posts/${slug}`,
        }] : [],
        logo: post.thumbnail?.url,
        screenshots: post.screenshots?.map(s => s.url) || [],
        vendor,
        productHunt: {
          upvotes: post.votesCount,
          comments: post.commentsCount,
          launchDate: post.featuredAt || post.createdAt,
          hunterName: post.hunter?.name,
          makerNames,
        },
        isFeatured: !!post.featuredAt,
        isTrending: post.votesCount > 100, // Arbitrary threshold
      }

      return this.validateProduct(product)
    } catch (error) {
      console.error('Error parsing Product Hunt post:', error)
      this.metrics.errors++
      return null
    }
  }

  /**
   * Parse pricing from Product Hunt pricing type
   */
  private parsePricing(pricingType: string): Product['pricing'] {
    switch (pricingType.toUpperCase()) {
      case 'FREE':
        return {
          model: 'freemium',
          startingPrice: 0,
          currency: 'USD',
        }

      case 'PAID':
      case 'SUBSCRIPTION':
        return {
          model: 'subscription',
          currency: 'USD',
        }

      case 'ONE_TIME_PURCHASE':
        return {
          model: 'one-time',
          currency: 'USD',
        }

      default:
        return undefined
    }
  }
}

/**
 * Worker export
 */
export default {
  async fetch(request: Request, env: ScraperEnv & { PRODUCTHUNT_API_TOKEN?: string }): Promise<Response> {
    const url = new URL(request.url)

    try {
      const scraper = new ProductHuntScraper(env)

      if (url.pathname === '/scrape') {
        const timeframe = url.searchParams.get('timeframe') as 'daily' | 'weekly' | 'monthly' || 'daily'
        const limit = parseInt(url.searchParams.get('limit') || '100')

        await scraper.scrape({ timeframe, limit })

        return new Response(JSON.stringify({
          success: true,
          metrics: scraper.getMetrics(),
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.pathname === '/product') {
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
        scraper: 'producthunt-scraper',
        endpoints: {
          '/scrape?timeframe=daily&limit=100': 'Scrape trending products',
          '/product?id=12345': 'Scrape single product',
          '/status': 'Get scraper status',
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      })

    } catch (error) {
      console.error('Product Hunt scraper error:', error)
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
  async scheduled(event: ScheduledEvent, env: ScraperEnv & { PRODUCTHUNT_API_TOKEN?: string }): Promise<void> {
    const scraper = new ProductHuntScraper(env)

    // Scrape daily, weekly, and monthly trending
    await scraper.scrape({ timeframe: 'daily', limit: 50 })
    await scraper.scrape({ timeframe: 'weekly', limit: 100 })
    await scraper.scrape({ timeframe: 'monthly', limit: 100 })

    console.log('Product Hunt scheduled scrape complete:', scraper.getMetrics())
  },
}
