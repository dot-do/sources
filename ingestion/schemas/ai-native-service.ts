// AI-Native Service Schema - Output of Phase 2 analysis
// Represents a reimagined software product as an AI-native, MCP-first service

import { z } from 'zod'

/**
 * MCP Tool - Model-controlled action
 */
export const MCPToolSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  description: z.string(),
  inputSchema: z.record(z.unknown()).describe('JSON Schema for inputs'),
  outputSchema: z.record(z.unknown()).describe('JSON Schema for outputs'),
  examples: z.array(
    z.object({
      input: z.record(z.unknown()),
      output: z.record(z.unknown()),
      description: z.string().optional(),
    })
  ),
  category: z.string().optional(),
  isAsync: z.boolean().default(false),
  estimatedDuration: z.number().optional().describe('Estimated duration in seconds'),
})

export type MCPTool = z.infer<typeof MCPToolSchema>

/**
 * MCP Resource - Application-controlled data (read-only)
 */
export const MCPResourceSchema = z.object({
  uri: z.string().regex(/^[a-z0-9-]+:\/\/.+$/),
  name: z.string(),
  description: z.string(),
  mimeType: z.string(),
  schema: z.record(z.unknown()).optional(),
  cacheDuration: z.number().optional().describe('Cache duration in seconds'),
  requiresAuth: z.boolean().default(false),
})

export type MCPResource = z.infer<typeof MCPResourceSchema>

/**
 * MCP Prompt - User-controlled template
 */
export const MCPPromptSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_-]*$/),
  description: z.string(),
  template: z.string(),
  arguments: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      required: z.boolean().default(false),
      default: z.unknown().optional(),
      type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    })
  ),
  examples: z.array(
    z.object({
      arguments: z.record(z.unknown()),
      output: z.string(),
    })
  ).optional(),
  category: z.string().optional(),
})

export type MCPPrompt = z.infer<typeof MCPPromptSchema>

/**
 * MCP Specification (complete)
 */
export const MCPSpecificationSchema = z.object({
  version: z.string().default('2025-03-26'),
  tools: z.array(MCPToolSchema),
  resources: z.array(MCPResourceSchema),
  prompts: z.array(MCPPromptSchema),
  capabilities: z.object({
    tools: z.boolean().default(true),
    resources: z.boolean().default(true),
    prompts: z.boolean().default(true),
    logging: z.boolean().default(false),
  }).optional(),
})

export type MCPSpecification = z.infer<typeof MCPSpecificationSchema>

/**
 * Usage-based pricing metric
 */
export const PricingMetricSchema = z.object({
  name: z.string(),
  unit: z.string(),
  price: z.number(),
  currency: z.string().default('USD'),
  description: z.string().optional(),
  includedInFreeTier: z.number().optional(),
})

export type PricingMetric = z.infer<typeof PricingMetricSchema>

/**
 * Usage-based pricing tier
 */
export const PricingTierSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  includedUnits: z.record(z.number()), // metric name → units
  overagePricing: z.record(z.number()), // metric name → price per unit
  features: z.array(z.string()),
  monthlyPrice: z.number().optional(),
  setupFee: z.number().optional(),
})

export type PricingTier = z.infer<typeof PricingTierSchema>

/**
 * Usage-based pricing model
 */
export const UsageBasedPricingSchema = z.object({
  model: z.enum(['pay-per-action', 'pay-per-outcome', 'pay-per-compute', 'hybrid']),
  metrics: z.array(PricingMetricSchema),
  tiers: z.array(PricingTierSchema).optional(),
  freeTier: z.boolean().default(true),
  volumeDiscounts: z.array(
    z.object({
      fromUnits: z.number(),
      toUnits: z.number().optional(),
      discountPercent: z.number(),
    })
  ).optional(),
})

export type UsageBasedPricing = z.infer<typeof UsageBasedPricingSchema>

/**
 * Core job-to-be-done
 */
export const JobToBeDoneSchema = z.object({
  problem: z.string(),
  workflows: z.array(z.string()),
  outcomes: z.array(z.string()),
  currentSolution: z.string().optional(),
  painPoints: z.array(z.string()).optional(),
  opportunityCost: z.string().optional(),
})

export type JobToBeDone = z.infer<typeof JobToBeDoneSchema>

/**
 * Cloudflare Workers architecture specification
 */
export const ArchitectureSchema = z.object({
  runtime: z.string().default('cloudflare-workers'),
  storage: z.object({
    r2: z.array(z.string()).optional(),
    d1: z.array(z.string()).optional(),
    kv: z.array(z.string()).optional(),
    durable_objects: z.array(z.string()).optional(),
  }),
  bindings: z.record(z.unknown()).optional(),
  integrations: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['api', 'webhook', 'mcp', 'oauth', 'database']),
      required: z.boolean().default(false),
      config: z.record(z.unknown()).optional(),
    })
  ),
  compute: z.object({
    cpuTime: z.string().optional(),
    memory: z.string().optional(),
    concurrency: z.number().optional(),
  }).optional(),
})

export type Architecture = z.infer<typeof ArchitectureSchema>

/**
 * Agent capabilities
 */
export const CapabilitiesSchema = z.object({
  autonomous: z.boolean().describe('Can run without human intervention'),
  multiStep: z.boolean().describe('Orchestrates multi-step workflows'),
  realTime: z.boolean().describe('Processes events in real-time'),
  scheduled: z.boolean().describe('Supports scheduled/cron execution'),
  streaming: z.boolean().describe('Supports streaming responses'),
  contextAware: z.boolean().describe('Maintains context across interactions'),
})

export type Capabilities = z.infer<typeof CapabilitiesSchema>

/**
 * Migration guide from traditional product
 */
export const MigrationGuideSchema = z.object({
  fromProduct: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  estimatedTime: z.string(),
  steps: z.array(z.string()),
  dataExport: z.boolean().describe('Can export data from original product'),
  featureParity: z.number().min(0).max(100).describe('Feature parity percentage'),
  breakingChanges: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
})

export type MigrationGuide = z.infer<typeof MigrationGuideSchema>

/**
 * AI-Native Service (complete definition)
 */
export const AINativeServiceSchema = z.object({
  // Identity
  id: z.string().describe('Unique service ID (UUID)'),
  originalProductId: z.string().describe('Reference to source product'),
  originalProductName: z.string(),
  name: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  tagline: z.string(),
  description: z.string(),
  longDescription: z.string().optional(),

  // Core Job-to-be-Done
  jobToBeDone: JobToBeDoneSchema,

  // MCP Specification (tools, resources, prompts)
  mcp: MCPSpecificationSchema,

  // Usage-Based Pricing
  pricing: UsageBasedPricingSchema,

  // Architecture
  architecture: ArchitectureSchema,

  // Capabilities
  capabilities: CapabilitiesSchema,

  // Classification
  category: z.string(),
  subcategories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),

  // Target Audience
  targetRoles: z.array(z.string()).default([]),
  targetOccupations: z.array(z.string()).optional(), // O*NET codes
  teamSize: z.enum(['solo', 'small', 'medium', 'large', 'enterprise', 'any']).default('any'),

  // Automation & AI
  automationPotential: z.number().min(0).max(100).describe('Percentage of workflows that can be automated'),
  aiModels: z.array(z.string()).default([]).describe('AI models used (GPT-4, Claude, etc.)'),
  humanInLoopRequired: z.boolean().default(false),

  // Migration from Traditional Product
  migration: MigrationGuideSchema,

  // Comparison to Original Product
  comparison: z.object({
    costSavings: z.number().optional().describe('Estimated cost savings percentage'),
    timeSavings: z.number().optional().describe('Estimated time savings percentage'),
    featureComparison: z.array(
      z.object({
        feature: z.string(),
        traditional: z.string(),
        aiNative: z.string(),
        advantage: z.enum(['traditional', 'ai-native', 'neutral']),
      })
    ).optional(),
  }).optional(),

  // Documentation
  documentation: z.object({
    apiDocsUrl: z.string().url().optional(),
    examplesUrl: z.string().url().optional(),
    tutorialsUrl: z.string().url().optional(),
    changelogUrl: z.string().url().optional(),
  }).optional(),

  // Status
  status: z.enum(['draft', 'analyzing', 'completed', 'published', 'deprecated']).default('draft'),
  version: z.string().default('1.0.0'),

  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().describe('Agent/worker that created this'),
  analyzedBy: z.array(z.string()).describe('Agents that contributed to analysis'),

  // Quality Metrics
  completeness: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  validationErrors: z.array(z.string()).default([]),
})

export type AINativeService = z.infer<typeof AINativeServiceSchema>

/**
 * Analysis batch for queue processing
 */
export const AnalysisBatchSchema = z.object({
  batchId: z.string(),
  products: z.array(z.string()).describe('Product IDs to analyze'),
  domain: z.string().describe('Domain category (CRM, Marketing, etc.)'),
  teamName: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  results: z.array(AINativeServiceSchema).optional(),
  errors: z.array(z.string()).optional(),
})

export type AnalysisBatch = z.infer<typeof AnalysisBatchSchema>

/**
 * Validate AI-native service
 */
export function validateService(data: unknown): { success: boolean; service?: AINativeService; errors?: string[] } {
  try {
    const service = AINativeServiceSchema.parse(data)
    return { success: true, service }
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

/**
 * Calculate service definition completeness
 */
export function calculateServiceCompleteness(service: Partial<AINativeService>): number {
  const fields = [
    'name',
    'description',
    'longDescription',
    'tagline',
    'jobToBeDone',
    'mcp',
    'pricing',
    'architecture',
    'capabilities',
    'migration',
    'targetRoles',
    'automationPotential',
  ]

  let score = 0
  for (const field of fields) {
    if (service[field as keyof AINativeService]) {
      const value = service[field as keyof AINativeService]
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
 * Generate slug from service name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
