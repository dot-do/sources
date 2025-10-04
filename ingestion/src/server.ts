/**
 * Data Ingestion Scraper Server
 *
 * Runs in Cloudflare Container with full Linux access
 * Provides HTTP endpoints for scraping operations
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', logger())

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  })
})

// Root endpoint
app.get('/', (c) => {
  return c.json({
    service: 'Data Ingestion Scraper',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      scrape: {
        theorg: 'POST /scrape/theorg',
        custom: 'POST /scrape/custom'
      }
    }
  })
})

// TheOrg scraping endpoint
app.post('/scrape/theorg', async (c) => {
  const body = await c.req.json()
  const { url } = body

  if (!url) {
    return c.json({ error: 'url required' }, 400)
  }

  try {
    // Import Playwright for browser automation
    const { chromium } = await import('playwright')

    // Launch browser
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    })

    const page = await context.newPage()

    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle' })

    // Extract __NEXT_DATA__
    const nextData = await page.evaluate(() => {
      const scriptTag = document.querySelector('#__NEXT_DATA__')
      if (scriptTag) {
        return JSON.parse(scriptTag.textContent || '{}')
      }
      return null
    })

    await browser.close()

    if (!nextData) {
      return c.json({ error: 'Failed to extract __NEXT_DATA__' }, 404)
    }

    return c.json({
      status: 'success',
      data: nextData
    })
  } catch (error: any) {
    console.error('Scraping error:', error)
    return c.json({ error: error.message }, 500)
  }
})

// Custom scraping endpoint
app.post('/scrape/custom', async (c) => {
  const body = await c.req.json()
  const { url, selector, waitFor } = body

  if (!url) {
    return c.json({ error: 'url required' }, 400)
  }

  try {
    const { chromium } = await import('playwright')

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(url, { waitUntil: 'networkidle' })

    // Optional wait
    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout: 10000 })
    }

    // Extract content
    const content = selector
      ? await page.locator(selector).textContent()
      : await page.content()

    await browser.close()

    return c.json({
      status: 'success',
      content
    })
  } catch (error: any) {
    console.error('Scraping error:', error)
    return c.json({ error: error.message }, 500)
  }
})

// Start server
const port = parseInt(process.env.PORT || '8080')

console.log(`🚀 Data Ingestion Scraper Server starting on port ${port}`)
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)

export default {
  port,
  fetch: app.fetch
}
