import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { Env, ContextVariables } from './types'

// Middleware
import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { errorHandler } from './middleware/error-handler'

// Routes
import { enrichPersonRoute } from './routes/enrich-person'
import { enrichCompanyRoute } from './routes/enrich-company'
import { enrichBulkRoute } from './routes/enrich-bulk'
import { searchPeopleRoute } from './routes/search-people'
import { statusRoute } from './routes/status'

// Durable Object
export { EnrichmentEngine } from './enrichment/engine'

// Create Hono app
const app = new Hono<{ Bindings: Env; Variables: ContextVariables }>()

// Global middleware
app.use('*', logger())
app.use('*', cors({
  origin: '*', // Configure based on your needs
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Credits-Limit',
    'X-Credits-Used',
    'X-Credits-Remaining',
    'X-Credits-Reset'
  ],
  maxAge: 86400
}))

// Error handler
app.onError(errorHandler)

// Health check (no auth required)
app.get('/', (c) => {
  return c.json({
    name: 'Lead Enrichment API',
    version: c.env.API_VERSION || 'v1',
    status: 'operational',
    documentation: 'https://docs.leadenrich.do'
  })
})

// API routes (require authentication and rate limiting)
const api = new Hono<{ Bindings: Env; Variables: ContextVariables }>()
api.use('*', authMiddleware)
api.use('*', rateLimitMiddleware)

// Mount routes
api.post('/enrich/person', enrichPersonRoute)
api.post('/enrich/company', enrichCompanyRoute)
api.post('/enrich/bulk', enrichBulkRoute)
api.get('/search/people', searchPeopleRoute)
api.get('/status', statusRoute)

// Mount API under /v1
app.route('/v1', api)

// 404 handler
app.notFound((c) => {
  return c.json({
    error: {
      type: 'not_found',
      message: 'The requested endpoint does not exist',
      path: c.req.path
    }
  }, 404)
})

export default app
