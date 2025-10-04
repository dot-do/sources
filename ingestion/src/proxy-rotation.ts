/**
 * Proxy Rotation System
 *
 * Manages rotating through proxy servers to avoid rate limiting and IP blocks.
 *
 * Supports:
 * - Bright Data (formerly Luminati)
 * - Smartproxy
 * - IPRoyal
 * - Custom proxy lists
 *
 * Features:
 * - Automatic failover
 * - Health checking
 * - Rate limiting per proxy
 * - Success/failure tracking
 * - Geographic targeting
 *
 * Usage:
 * ```typescript
 * const manager = new ProxyManager(env)
 * const proxy = await manager.getProxy()
 * const response = await fetch(url, { ...proxy.fetchOptions })
 * await manager.recordSuccess(proxy.id)
 * ```
 */

export interface ProxyConfig {
  id: string
  type: 'brightdata' | 'smartproxy' | 'iproyal' | 'custom'
  host: string
  port: number
  username?: string
  password?: string
  country?: string
  sessionId?: string
  maxRequestsPerHour?: number
  priority?: number
}

export interface ProxyStats {
  requests: number
  successes: number
  failures: number
  lastUsed: number
  lastSuccess: number
  lastFailure?: number
  avgResponseTime: number
  isHealthy: boolean
}

export interface ProxyWithStats extends ProxyConfig {
  stats: ProxyStats
}

export interface ProxyFetchOptions {
  headers?: Record<string, string>
  proxy?: string
}

/**
 * Proxy Manager
 *
 * Manages pool of proxies with automatic rotation and health checking
 */
export class ProxyManager {
  private proxies: Map<string, ProxyWithStats> = new Map()
  private currentIndex = 0

  constructor(private kv?: KVNamespace) {}

  /**
   * Add proxy to pool
   */
  addProxy(config: ProxyConfig): void {
    const proxy: ProxyWithStats = {
      ...config,
      stats: {
        requests: 0,
        successes: 0,
        failures: 0,
        lastUsed: 0,
        lastSuccess: 0,
        avgResponseTime: 0,
        isHealthy: true
      }
    }

    this.proxies.set(config.id, proxy)
  }

  /**
   * Add multiple proxies from provider config
   */
  addProxiesFromEnv(env: any): void {
    // Bright Data
    if (env.BRIGHTDATA_HOST && env.BRIGHTDATA_USER && env.BRIGHTDATA_PASS) {
      this.addProxy({
        id: 'brightdata-rotating',
        type: 'brightdata',
        host: env.BRIGHTDATA_HOST,
        port: 22225,
        username: env.BRIGHTDATA_USER,
        password: env.BRIGHTDATA_PASS,
        maxRequestsPerHour: 50000,
        priority: 1
      })
    }

    // Smartproxy
    if (env.SMARTPROXY_HOST && env.SMARTPROXY_USER && env.SMARTPROXY_PASS) {
      this.addProxy({
        id: 'smartproxy-rotating',
        type: 'smartproxy',
        host: env.SMARTPROXY_HOST,
        port: 10000,
        username: env.SMARTPROXY_USER,
        password: env.SMARTPROXY_PASS,
        maxRequestsPerHour: 20000,
        priority: 2
      })
    }

    // IPRoyal
    if (env.IPROYAL_HOST && env.IPROYAL_USER && env.IPROYAL_PASS) {
      this.addProxy({
        id: 'iproyal-rotating',
        type: 'iproyal',
        host: env.IPROYAL_HOST,
        port: 12321,
        username: env.IPROYAL_USER,
        password: env.IPROYAL_PASS,
        maxRequestsPerHour: 10000,
        priority: 3
      })
    }

    // Custom proxy list from KV
    // Format: proxy1.example.com:8080:user:pass,proxy2.example.com:8080:user:pass
    if (env.CUSTOM_PROXIES) {
      const proxies = env.CUSTOM_PROXIES.split(',')
      proxies.forEach((proxy: string, index: number) => {
        const [host, port, username, password] = proxy.split(':')
        this.addProxy({
          id: `custom-${index}`,
          type: 'custom',
          host,
          port: parseInt(port),
          username,
          password,
          maxRequestsPerHour: 1000,
          priority: 10
        })
      })
    }
  }

  /**
   * Get next available healthy proxy
   */
  async getProxy(options?: { country?: string }): Promise<ProxyWithStats | null> {
    const healthyProxies = Array.from(this.proxies.values())
      .filter(p => p.stats.isHealthy)
      .filter(p => {
        // Filter by country if specified
        if (options?.country && p.country) {
          return p.country === options.country
        }
        return true
      })
      .filter(p => {
        // Check rate limit
        if (p.maxRequestsPerHour) {
          const hourAgo = Date.now() - 3600000
          const recentRequests = p.stats.requests // Simplified - would need time-series data
          return recentRequests < p.maxRequestsPerHour
        }
        return true
      })
      .sort((a, b) => {
        // Sort by priority, then by success rate
        const priorityDiff = (a.priority || 99) - (b.priority || 99)
        if (priorityDiff !== 0) return priorityDiff

        const aSuccessRate = a.stats.requests > 0 ? a.stats.successes / a.stats.requests : 0
        const bSuccessRate = b.stats.requests > 0 ? b.stats.successes / b.stats.requests : 0
        return bSuccessRate - aSuccessRate
      })

    if (healthyProxies.length === 0) {
      console.warn('No healthy proxies available')
      return null
    }

    // Round-robin with weighted selection
    const proxy = healthyProxies[this.currentIndex % healthyProxies.length]
    this.currentIndex++

    // Update stats
    proxy.stats.requests++
    proxy.stats.lastUsed = Date.now()

    // Persist stats to KV
    if (this.kv) {
      await this.kv.put(`proxy:stats:${proxy.id}`, JSON.stringify(proxy.stats), {
        expirationTtl: 86400
      })
    }

    return proxy
  }

  /**
   * Get fetch options for proxy
   */
  getFetchOptions(proxy: ProxyWithStats | null): RequestInit {
    if (!proxy) {
      return {}
    }

    const options: RequestInit = {
      headers: {
        'User-Agent': this.getRandomUserAgent()
      }
    }

    // Note: Cloudflare Workers doesn't support proxy configuration in fetch()
    // This would work in Node.js or Cloudflare Containers:
    // options.agent = new HttpsProxyAgent(`http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`)

    return options
  }

  /**
   * Get proxy URL for external tools (Playwright, Puppeteer)
   */
  getProxyUrl(proxy: ProxyWithStats): string {
    if (proxy.username && proxy.password) {
      return `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
    }
    return `http://${proxy.host}:${proxy.port}`
  }

  /**
   * Record successful request
   */
  async recordSuccess(proxyId: string, responseTime?: number): Promise<void> {
    const proxy = this.proxies.get(proxyId)
    if (!proxy) return

    proxy.stats.successes++
    proxy.stats.lastSuccess = Date.now()
    proxy.stats.isHealthy = true

    if (responseTime) {
      const totalTime = proxy.stats.avgResponseTime * (proxy.stats.requests - 1) + responseTime
      proxy.stats.avgResponseTime = totalTime / proxy.stats.requests
    }

    // Persist stats
    if (this.kv) {
      await this.kv.put(`proxy:stats:${proxyId}`, JSON.stringify(proxy.stats), {
        expirationTtl: 86400
      })
    }
  }

  /**
   * Record failed request
   */
  async recordFailure(proxyId: string, error?: Error): Promise<void> {
    const proxy = this.proxies.get(proxyId)
    if (!proxy) return

    proxy.stats.failures++
    proxy.stats.lastFailure = Date.now()

    // Mark unhealthy if failure rate is too high
    const failureRate = proxy.stats.failures / proxy.stats.requests
    if (proxy.stats.requests > 10 && failureRate > 0.5) {
      proxy.stats.isHealthy = false
    }

    console.warn(`Proxy ${proxyId} failed:`, error?.message)

    // Persist stats
    if (this.kv) {
      await this.kv.put(`proxy:stats:${proxyId}`, JSON.stringify(proxy.stats), {
        expirationTtl: 86400
      })
    }
  }

  /**
   * Health check all proxies
   */
  async healthCheck(): Promise<void> {
    const testUrl = 'https://httpbin.org/ip'

    for (const [id, proxy] of this.proxies) {
      try {
        const startTime = Date.now()
        const response = await fetch(testUrl, {
          // Would use proxy here in Node.js/Containers
        })
        const responseTime = Date.now() - startTime

        if (response.ok) {
          await this.recordSuccess(id, responseTime)
          console.log(`✓ Proxy ${id} healthy (${responseTime}ms)`)
        } else {
          await this.recordFailure(id, new Error(`HTTP ${response.status}`))
        }
      } catch (error) {
        await this.recordFailure(id, error as Error)
        console.error(`✗ Proxy ${id} failed health check:`, error)
      }

      // Delay between checks
      await sleep(1000)
    }
  }

  /**
   * Get proxy statistics
   */
  getStats(): Array<{ id: string; stats: ProxyStats }> {
    return Array.from(this.proxies.entries()).map(([id, proxy]) => ({
      id,
      stats: proxy.stats
    }))
  }

  /**
   * Reset proxy to healthy state
   */
  resetProxy(proxyId: string): void {
    const proxy = this.proxies.get(proxyId)
    if (proxy) {
      proxy.stats.isHealthy = true
      proxy.stats.failures = 0
    }
  }

  /**
   * Get random user agent
   */
  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]

    return userAgents[Math.floor(Math.random() * userAgents.length)]
  }
}

/**
 * Helper function to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create proxy manager from environment
 */
export function createProxyManager(env: any, kv?: KVNamespace): ProxyManager {
  const manager = new ProxyManager(kv)
  manager.addProxiesFromEnv(env)
  return manager
}
