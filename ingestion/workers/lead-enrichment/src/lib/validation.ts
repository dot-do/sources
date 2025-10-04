import { z } from 'zod'

// Request Validation Schemas

export const PersonEnrichmentRequestSchema = z.object({
  email: z.string().email().optional(),
  domain: z.string().min(1).optional(),
  github_username: z.string().min(1).optional(),
  linkedin_url: z.string().url().optional(),
}).refine(
  (data) => data.email || data.domain || data.github_username || data.linkedin_url,
  { message: 'At least one of email, domain, github_username, or linkedin_url is required' }
)

export const CompanyEnrichmentRequestSchema = z.object({
  domain: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  website: z.string().url().optional(),
}).refine(
  (data) => data.domain || data.name || data.website,
  { message: 'At least one of domain, name, or website is required' }
)

export const BulkEnrichmentRequestSchema = z.object({
  type: z.enum(['person', 'company']),
  items: z.array(z.union([
    PersonEnrichmentRequestSchema,
    CompanyEnrichmentRequestSchema
  ])).min(1).max(100) // Limit bulk requests to 100 items
})

export const SearchPeopleRequestSchema = z.object({
  domain: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
})

// Query Parameter Schemas

export const SearchPeopleQuerySchema = z.object({
  domain: z.string().min(1),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0)).optional(),
})

// API Key Validation

export const ApiKeySchema = z.string().regex(/^api_(live|test)_[a-zA-Z0-9]{32}$/, {
  message: 'Invalid API key format. Expected: api_live_xxx or api_test_xxx'
})

// Helper function to validate and parse request body
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return {
        success: false,
        error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
      }
    }

    return { success: true, data: result.data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON body'
    }
  }
}

// Helper function to validate query parameters
export function validateQueryParams<T>(
  url: URL,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const params = Object.fromEntries(url.searchParams.entries())
    const result = schema.safeParse(params)

    if (!result.success) {
      return {
        success: false,
        error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
      }
    }

    return { success: true, data: result.data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid query parameters'
    }
  }
}
