import type { Context, Next } from 'hono'
import type { Env, ApiKey } from '../types'
import { ApiKeySchema } from '../lib/validation'

/**
 * Authentication middleware
 * Validates API key from Authorization header and attaches api_key to context
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader) {
    return c.json(
      {
        error: {
          type: 'authentication_error',
          message: 'Missing Authorization header',
          details: 'Include "Authorization: Bearer api_live_xxx" header in your request',
        },
      },
      401
    )
  }

  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer') {
    return c.json(
      {
        error: {
          type: 'authentication_error',
          message: 'Invalid authentication scheme',
          details: 'Use "Bearer" authentication scheme',
        },
      },
      401
    )
  }

  if (!token) {
    return c.json(
      {
        error: {
          type: 'authentication_error',
          message: 'Missing API key',
          details: 'Provide API key after "Bearer" in Authorization header',
        },
      },
      401
    )
  }

  // Validate API key format
  const validation = ApiKeySchema.safeParse(token)
  if (!validation.success) {
    return c.json(
      {
        error: {
          type: 'authentication_error',
          message: 'Invalid API key format',
          details: 'API key must be in format: api_live_xxx or api_test_xxx',
        },
      },
      401
    )
  }

  // Hash the API key for lookup
  const keyHash = await hashApiKey(token)

  // Look up API key in database
  const apiKey = await c.env.DB.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND revoked = 0')
    .bind(keyHash)
    .first<ApiKey>()

  if (!apiKey) {
    return c.json(
      {
        error: {
          type: 'authentication_error',
          message: 'Invalid or revoked API key',
          details: 'The provided API key is not valid or has been revoked',
        },
      },
      401
    )
  }

  // Check if API key has expired
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return c.json(
      {
        error: {
          type: 'authentication_error',
          message: 'API key has expired',
          details: 'Your API key expired on ' + apiKey.expires_at,
        },
      },
      401
    )
  }

  // Attach API key to context
  c.set('api_key', apiKey)

  // Update last_used_at timestamp (async, don't await)
  c.env.DB.prepare('UPDATE api_keys SET last_used_at = datetime("now") WHERE id = ?')
    .bind(apiKey.id)
    .run()
    .catch((error) => {
      console.error('Failed to update last_used_at:', error)
    })

  await next()
}

/**
 * Hash API key using SHA-256
 */
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
