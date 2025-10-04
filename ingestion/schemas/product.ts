// Product Schema - Core data structure for scraped software products
// Used across all scraping sources (G2, Capterra, Product Hunt, HN, GitHub, etc.)

import { z } from 'zod'

/**
 * Product pricing models
 */
export const PricingModelSchema = z.enum(['freemium', 'subscription', 'one-time', 'usage-based', 'enterprise', 'open-source'])

/**
 * Product pricing tier
 */
export const PricingTierSchema = z.object({
  name: z.string(),
  price: z.number(),
  features: z.array(z.string()),
  seats: z.number().optional(),
  billingPeriod: z.enum(['monthly', 'annual', 'one-time']).optional(),
})

/**
 * Product pricing information
 */
export const PricingSchema = z.object({
  model: PricingModelSchema,
  startingPrice: z.number().optional(),
  currency: z.string().default('USD'),
  tiers: z.array(PricingTierSchema).optional(),
  freeTrialDays: z.number().optional(),
  customPricing: z.boolean().default(false),
})

/**
 * Product review/rating from a source
 */
export const ReviewSchema = z.object({
  count: z.number(),
  rating: z.number().min(0).max(5),
  source: z.string(),
  url: z.string().url().optional(),
})

/**
 * Company/vendor information
 */
export const VendorSchema = z.object({
  name: z.string(),
  website: z.string().url().optional(),
  founded: z.string().optional(),
  headquarters: z.string().optional(),
  companySize: z.string().optional(),
  funding: z.string().optional(),
})

/**
 * Main Product schema
 *
 * Represents a software product scraped from any source
 */
export const ProductSchema = z.object({
  // Identity
  id: z.string().describe('Unique identifier (UUID)'),
  source: z.enum(['g2', 'capterra', 'producthunt', 'hackernews', 'github', 'trustradius', 'softwareadvice', 'getapp', 'alternativeto', 'saashub', 'indiehackers', 'other']),
  sourceId: z.string().describe('ID from source platform'),
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  url: z.string().url(),

  // Classification
  category: z.string(),
  subcategories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),

  // Description
  tagline: z.string().optional(),
  description: z.string().optional(),
  longDescription: z.string().optional(),

  // Pricing
  pricing: PricingSchema.optional(),

  // Features
  features: z.array(z.string()).default([]),
  integrations: z.array(z.string()).default([]),
  platforms: z.array(z.string()).default([]), // web, ios, android, windows, mac, linux
  languages: z.array(z.string()).default([]), // UI languages

  // Social Proof
  reviews: z.array(ReviewSchema).default([]),
  users: z.number().optional(),
  customers: z.array(z.string()).default([]), // Customer logos/names
  testimonials: z.array(z.string()).default([]),

  // Vendor
  vendor: VendorSchema.optional(),

  // Media
  logo: z.string().url().optional(),
  screenshots: z.array(z.string().url()).default([]),
  videos: z.array(z.string().url()).default([]),

  // Links
  blogUrl: z.string().url().optional(),
  documentationUrl: z.string().url().optional(),
  supportUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  twitterHandle: z.string().optional(),
  linkedinUrl: z.string().url().optional(),

  // Product Hunt specific
  productHunt: z.object({
    upvotes: z.number().optional(),
    comments: z.number().optional(),
    launchDate: z.string().optional(),
    hunterName: z.string().optional(),
    makerNames: z.array(z.string()).optional(),
  }).optional(),

  // GitHub specific
  github: z.object({
    stars: z.number().optional(),
    forks: z.number().optional(),
    issues: z.number().optional(),
    language: z.string().optional(),
    license: z.string().optional(),
    lastCommit: z.string().optional(),
  }).optional(),

  // Flags
  isOpenSource: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isVerified: z.boolean().default(false),

  // Scraping Metadata
  scrapedAt: z.string().datetime(),
  scrapedBy: z.string().describe('Scraper worker ID'),
  scrapedVersion: z.string().describe('Scraper version'),

  // Data Quality
  completeness: z.number().min(0).max(100).describe('Data completeness score'),
  confidence: z.number().min(0).max(100).describe('Data confidence score'),
  validationErrors: z.array(z.string()).default([]),
})

export type Product = z.infer<typeof ProductSchema>
export type PricingModel = z.infer<typeof PricingModelSchema>
export type PricingTier = z.infer<typeof PricingTierSchema>
export type Pricing = z.infer<typeof PricingSchema>
export type Review = z.infer<typeof ReviewSchema>
export type Vendor = z.infer<typeof VendorSchema>

/**
 * Batch of products for queue processing
 */
export const ProductBatchSchema = z.object({
  batchId: z.string(),
  source: z.string(),
  category: z.string().optional(),
  products: z.array(ProductSchema),
  timestamp: z.string().datetime(),
  scrapedBy: z.string(),
})

export type ProductBatch = z.infer<typeof ProductBatchSchema>

/**
 * Queue message for product scraping
 */
export const ScrapingQueueMessageSchema = z.object({
  messageId: z.string(),
  source: z.string(),
  category: z.string().optional(),
  productUrl: z.string().url().optional(),
  productId: z.string().optional(),
  priority: z.number().min(0).max(10).default(5),
  retryCount: z.number().default(0),
  metadata: z.record(z.unknown()).optional(),
})

export type ScrapingQueueMessage = z.infer<typeof ScrapingQueueMessageSchema>

/**
 * Calculate product data completeness score
 */
export function calculateCompleteness(product: Partial<Product>): number {
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
    'url',
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
 * Validate product data
 */
export function validateProduct(data: unknown): { success: boolean; product?: Product; errors?: string[] } {
  try {
    const product = ProductSchema.parse(data)
    return { success: true, product }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      }
    }
    return { success: false, errors: ['Unknown validation error'] }
  }
}
