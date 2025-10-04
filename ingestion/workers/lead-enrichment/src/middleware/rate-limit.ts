import type { Context, Next } from 'hono'
import type { Env, ApiKey, RateLimitInfo, CreditInfo } from '../types'

/**
 * Rate limiting middleware
 * Implements token bucket algorithm using KV for distributed rate limiting
 */
export async function rateLimitMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const apiKey = c.get('api_key') as ApiKey

  if (!apiKey) {
    return c.json(
      {
        error: {
          type: 'internal_error',
          message: 'API key not found in context',
          details: 'Authentication middleware must run before rate limiting',
        },
      },
      500
    )
  }

  const now = Date.now()

  // Check rate limits (requests per minute and per day)
  const [minuteCheck, dayCheck, creditsCheck] = await Promise.all([
    checkRateLimit(c.env.RATE_LIMIT_KV, apiKey.id, 'minute', apiKey.rate_limit_rpm, 60),
    checkRateLimit(c.env.RATE_LIMIT_KV, apiKey.id, 'day', apiKey.rate_limit_rpd, 86400),
    checkCredits(c.env.DB, apiKey),
  ])

  // Check minute rate limit
  if (!minuteCheck.allowed) {
    c.header('X-RateLimit-Limit', apiKey.rate_limit_rpm.toString())
    c.header('X-RateLimit-Remaining', '0')
    c.header('X-RateLimit-Reset', minuteCheck.resetAt.toString())

    return c.json(
      {
        error: {
          type: 'rate_limit_error',
          message: 'Rate limit exceeded',
          details: `You have exceeded the rate limit of ${apiKey.rate_limit_rpm} requests per minute`,
          retry_after: Math.ceil((minuteCheck.resetAt - now) / 1000),
        },
      },
      429
    )
  }

  // Check daily rate limit
  if (!dayCheck.allowed) {
    return c.json(
      {
        error: {
          type: 'rate_limit_error',
          message: 'Daily rate limit exceeded',
          details: `You have exceeded the daily rate limit of ${apiKey.rate_limit_rpd} requests`,
          retry_after: Math.ceil((dayCheck.resetAt - now) / 1000),
        },
      },
      429
    )
  }

  // Check credits
  if (!creditsCheck.allowed) {
    c.header('X-Credits-Limit', creditsCheck.info.limit.toString())
    c.header('X-Credits-Used', creditsCheck.info.used.toString())
    c.header('X-Credits-Remaining', '0')
    c.header('X-Credits-Reset', creditsCheck.info.reset.toString())

    return c.json(
      {
        error: {
          type: 'insufficient_credits',
          message: 'Insufficient credits',
          details: `You have used all ${creditsCheck.info.limit} credits for this billing period. Credits reset on ${new Date(creditsCheck.info.reset * 1000).toISOString()}`,
        },
      },
      402
    )
  }

  // Attach rate limit info to context
  c.set('rate_limit', minuteCheck.info)
  c.set('credits', creditsCheck.info)

  // Set rate limit headers
  c.header('X-RateLimit-Limit', apiKey.rate_limit_rpm.toString())
  c.header('X-RateLimit-Remaining', minuteCheck.info.remaining.toString())
  c.header('X-RateLimit-Reset', minuteCheck.info.reset.toString())

  // Set credit headers
  c.header('X-Credits-Limit', creditsCheck.info.limit.toString())
  c.header('X-Credits-Used', creditsCheck.info.used.toString())
  c.header('X-Credits-Remaining', creditsCheck.info.remaining.toString())
  c.header('X-Credits-Reset', creditsCheck.info.reset.toString())

  await next()

  // Increment counters after successful request (async, don't await)
  Promise.all([
    incrementRateLimit(c.env.RATE_LIMIT_KV, apiKey.id, 'minute', 60),
    incrementRateLimit(c.env.RATE_LIMIT_KV, apiKey.id, 'day', 86400),
  ]).catch((error) => {
    console.error('Failed to increment rate limit counters:', error)
  })
}

/**
 * Check rate limit using KV
 */
async function checkRateLimit(
  kv: KVNamespace,
  apiKeyId: string,
  type: 'minute' | 'day',
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; info: RateLimitInfo; resetAt: number }> {
  const now = Date.now()
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000
  const resetAt = windowStart + windowSeconds * 1000
  const key = `ratelimit:${apiKeyId}:${type}:${windowStart}`

  const countStr = await kv.get(key)
  const count = countStr ? parseInt(countStr, 10) : 0

  const allowed = count < limit

  return {
    allowed,
    info: {
      limit,
      remaining: Math.max(0, limit - count - 1),
      reset: Math.floor(resetAt / 1000),
    },
    resetAt,
  }
}

/**
 * Increment rate limit counter in KV
 */
async function incrementRateLimit(kv: KVNamespace, apiKeyId: string, type: 'minute' | 'day', windowSeconds: number): Promise<void> {
  const now = Date.now()
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000
  const key = `ratelimit:${apiKeyId}:${type}:${windowStart}`

  const countStr = await kv.get(key)
  const count = countStr ? parseInt(countStr, 10) : 0

  await kv.put(key, (count + 1).toString(), {
    expirationTtl: windowSeconds + 60, // Add 1 minute buffer
  })
}

/**
 * Check available credits
 */
async function checkCredits(db: D1Database, apiKey: ApiKey): Promise<{ allowed: boolean; info: CreditInfo }> {
  const creditsResetAt = new Date(apiKey.credits_reset_at)
  const now = new Date()

  // Check if credits need to be reset (monthly reset)
  if (now >= creditsResetAt) {
    // Reset credits (async, don't await in this check)
    const nextResetAt = new Date(creditsResetAt)
    nextResetAt.setMonth(nextResetAt.getMonth() + 1)

    db.prepare('UPDATE api_keys SET credits_used = 0, credits_reset_at = ? WHERE id = ?')
      .bind(nextResetAt.toISOString(), apiKey.id)
      .run()
      .catch((error) => {
        console.error('Failed to reset credits:', error)
      })

    return {
      allowed: true,
      info: {
        limit: apiKey.credits_limit,
        used: 0,
        remaining: apiKey.credits_limit,
        reset: Math.floor(nextResetAt.getTime() / 1000),
      },
    }
  }

  const allowed = apiKey.credits_used < apiKey.credits_limit

  return {
    allowed,
    info: {
      limit: apiKey.credits_limit,
      used: apiKey.credits_used,
      remaining: Math.max(0, apiKey.credits_limit - apiKey.credits_used),
      reset: Math.floor(creditsResetAt.getTime() / 1000),
    },
  }
}
