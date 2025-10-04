/**
 * Proxy Rotation Usage Examples
 *
 * Examples showing how to integrate proxy rotation with workers
 */

import { createProxyManager, ProxyManager } from './proxy-rotation'

// ============================================================================
// Example 1: Basic usage with fetch
// ============================================================================

async function exampleBasicFetch(env: any) {
  // Create proxy manager
  const proxyManager = createProxyManager(env, env.KV)

  // Get a proxy
  const proxy = await proxyManager.getProxy()

  if (!proxy) {
    console.error('No proxies available')
    return
  }

  try {
    // Make request (note: fetch() in Workers doesn't support proxies directly)
    // This example shows the pattern - actual proxy usage requires Containers
    const response = await fetch('https://example.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 ...'
      }
    })

    const responseTime = 250 // Would measure actual time
    await proxyManager.recordSuccess(proxy.id, responseTime)

    return await response.text()
  } catch (error) {
    await proxyManager.recordFailure(proxy.id, error as Error)
    throw error
  }
}

// ============================================================================
// Example 2: With retry logic
// ============================================================================

async function exampleWithRetry(url: string, env: any, maxRetries = 3) {
  const proxyManager = createProxyManager(env, env.KV)

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const proxy = await proxyManager.getProxy()

    if (!proxy) {
      throw new Error('No proxies available')
    }

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      await proxyManager.recordSuccess(proxy.id)
      return await response.text()
    } catch (error) {
      await proxyManager.recordFailure(proxy.id, error as Error)

      if (attempt === maxRetries - 1) {
        throw error
      }

      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 1000)
    }
  }
}

// ============================================================================
// Example 3: With Playwright (in Cloudflare Container)
// ============================================================================

async function exampleWithPlaywright(url: string, env: any) {
  const proxyManager = createProxyManager(env, env.KV)
  const proxy = await proxyManager.getProxy()

  if (!proxy) {
    throw new Error('No proxies available')
  }

  try {
    // Import Playwright
    const { chromium } = await import('playwright')

    // Get proxy URL
    const proxyUrl = proxyManager.getProxyUrl(proxy)

    // Launch browser with proxy
    const browser = await chromium.launch({
      headless: true,
      proxy: {
        server: proxyUrl
      }
    })

    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(url, { waitUntil: 'networkidle' })

    const content = await page.content()

    await browser.close()

    await proxyManager.recordSuccess(proxy.id)

    return content
  } catch (error) {
    await proxyManager.recordFailure(proxy.id, error as Error)
    throw error
  }
}

// ============================================================================
// Example 4: Geographic targeting
// ============================================================================

async function exampleGeoTargeting(env: any) {
  const proxyManager = createProxyManager(env, env.KV)

  // Add proxies with country targeting
  proxyManager.addProxy({
    id: 'us-proxy-1',
    type: 'brightdata',
    host: 'brd.superproxy.io',
    port: 22225,
    username: 'brd-customer-xxx-country-us',
    password: 'xxx',
    country: 'US'
  })

  proxyManager.addProxy({
    id: 'uk-proxy-1',
    type: 'brightdata',
    host: 'brd.superproxy.io',
    port: 22225,
    username: 'brd-customer-xxx-country-gb',
    password: 'xxx',
    country: 'GB'
  })

  // Get US proxy
  const usProxy = await proxyManager.getProxy({ country: 'US' })
  console.log('Using US proxy:', usProxy?.id)

  // Get UK proxy
  const ukProxy = await proxyManager.getProxy({ country: 'GB' })
  console.log('Using UK proxy:', ukProxy?.id)
}

// ============================================================================
// Example 5: Health monitoring
// ============================================================================

async function exampleHealthMonitoring(env: any) {
  const proxyManager = createProxyManager(env, env.KV)

  // Run health check
  await proxyManager.healthCheck()

  // Get statistics
  const stats = proxyManager.getStats()

  console.log('Proxy Statistics:')
  stats.forEach(({ id, stats }) => {
    const successRate = stats.requests > 0 ? (stats.successes / stats.requests * 100).toFixed(1) : 0
    console.log(`${id}:`)
    console.log(`  Requests: ${stats.requests}`)
    console.log(`  Success Rate: ${successRate}%`)
    console.log(`  Avg Response Time: ${stats.avgResponseTime}ms`)
    console.log(`  Healthy: ${stats.isHealthy}`)
  })
}

// ============================================================================
// Example 6: Integration with scraping queue
// ============================================================================

async function exampleQueueIntegration(batch: MessageBatch<any>, env: any) {
  const proxyManager = createProxyManager(env, env.KV)

  for (const message of batch.messages) {
    const { url } = message.body

    // Try with up to 3 different proxies
    let success = false
    for (let attempt = 0; attempt < 3 && !success; attempt++) {
      const proxy = await proxyManager.getProxy()

      if (!proxy) {
        console.error('No proxies available')
        break
      }

      try {
        // Scrape URL
        const response = await fetch(url)

        if (response.ok) {
          await proxyManager.recordSuccess(proxy.id)
          success = true

          // Process data...
          const data = await response.json()
          await env.INGESTION_QUEUE.send({
            source: 'scraper',
            action: 'upsert',
            data,
            timestamp: Date.now()
          })
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error) {
        await proxyManager.recordFailure(proxy.id, error as Error)
        console.error(`Attempt ${attempt + 1} failed with proxy ${proxy.id}`)

        // Exponential backoff
        await sleep(Math.pow(2, attempt) * 1000)
      }
    }

    if (!success) {
      console.error(`Failed to scrape ${url} after 3 attempts`)
      message.retry() // Requeue message
    } else {
      message.ack() // Acknowledge success
    }
  }
}

// ============================================================================
// Helper functions
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// Configuration example
// ============================================================================

// Set these environment variables or secrets:
// BRIGHTDATA_HOST=brd.superproxy.io
// BRIGHTDATA_USER=brd-customer-xxx
// BRIGHTDATA_PASS=xxx

// SMARTPROXY_HOST=gate.smartproxy.com
// SMARTPROXY_USER=xxx
// SMARTPROXY_PASS=xxx

// IPROYAL_HOST=geo.iproyal.com
// IPROYAL_USER=xxx
// IPROYAL_PASS=xxx

// CUSTOM_PROXIES=proxy1.example.com:8080:user1:pass1,proxy2.example.com:8080:user2:pass2
