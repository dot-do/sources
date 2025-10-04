import type { Context } from 'hono'
import type { Env } from '../types'

/**
 * Global error handler middleware
 * Catches all unhandled errors and returns consistent error responses
 */
export function errorHandler(err: Error, c: Context<{ Bindings: Env }>) {
  console.error('Unhandled error:', err)

  // Log error to failed_requests table (async, don't await)
  const apiKey = c.get('api_key')
  const requestId = crypto.randomUUID()

  c.env.DB.prepare(
    `INSERT INTO failed_requests (id, api_key_id, user_id, endpoint, method, request_id, error_type, error_message, error_stack, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      apiKey?.id || null,
      apiKey?.user_id || null,
      c.req.path,
      c.req.method,
      requestId,
      err.name || 'UnknownError',
      err.message || 'An unknown error occurred',
      err.stack || null,
      c.req.header('CF-Connecting-IP') || null,
      c.req.header('User-Agent') || null
    )
    .run()
    .catch((dbError) => {
      console.error('Failed to log error to database:', dbError)
    })

  // Return appropriate error response based on error type
  if (err.name === 'ZodError') {
    return c.json(
      {
        error: {
          type: 'validation_error',
          message: 'Invalid request data',
          details: err.message,
          request_id: requestId,
        },
      },
      400
    )
  }

  if (err.name === 'TimeoutError') {
    return c.json(
      {
        error: {
          type: 'timeout_error',
          message: 'Request timed out',
          details: 'The request took too long to process. Please try again.',
          request_id: requestId,
        },
      },
      504
    )
  }

  if (err.name === 'NotFoundError') {
    return c.json(
      {
        error: {
          type: 'not_found',
          message: 'Resource not found',
          details: err.message,
          request_id: requestId,
        },
      },
      404
    )
  }

  if (err.name === 'DatabaseError') {
    return c.json(
      {
        error: {
          type: 'database_error',
          message: 'Database operation failed',
          details: 'An error occurred while accessing the database',
          request_id: requestId,
        },
      },
      500
    )
  }

  // Generic server error for unknown errors
  return c.json(
    {
      error: {
        type: 'internal_error',
        message: 'Internal server error',
        details: 'An unexpected error occurred. Please try again later.',
        request_id: requestId,
      },
    },
    500
  )
}

/**
 * Custom error classes for better error handling
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}
