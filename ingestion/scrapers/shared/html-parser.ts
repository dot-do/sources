/**
 * HTML Parser Utilities
 *
 * Lightweight HTML parsing for Cloudflare Workers
 * Uses HTMLRewriter for streaming parsing
 */

/**
 * Extract text content from HTML
 */
export function extractText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract meta tags from HTML
 */
export function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {}

  const metaRegex = /<meta[^>]+>/gi
  const matches = html.match(metaRegex) || []

  for (const match of matches) {
    const nameMatch = match.match(/name=["']([^"']+)["']/i)
    const propertyMatch = match.match(/property=["']([^"']+)["']/i)
    const contentMatch = match.match(/content=["']([^"']+)["']/i)

    const key = nameMatch?.[1] || propertyMatch?.[1]
    const value = contentMatch?.[1]

    if (key && value) {
      meta[key] = value
    }
  }

  return meta
}

/**
 * Extract JSON-LD structured data
 */
export function extractJsonLd(html: string): any[] {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const matches = [...html.matchAll(scriptRegex)]

  return matches
    .map(match => {
      try {
        return JSON.parse(match[1])
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

/**
 * Extract Open Graph data
 */
export function extractOpenGraph(html: string): Record<string, string> {
  const meta = extractMeta(html)
  const og: Record<string, string> = {}

  for (const [key, value] of Object.entries(meta)) {
    if (key.startsWith('og:')) {
      og[key.replace('og:', '')] = value
    }
  }

  return og
}

/**
 * Extract links by selector pattern
 */
export function extractLinks(html: string, pattern?: RegExp): string[] {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
  const matches = [...html.matchAll(linkRegex)]

  let links = matches.map(match => match[1])

  if (pattern) {
    links = links.filter(link => pattern.test(link))
  }

  return [...new Set(links)] // Deduplicate
}

/**
 * Extract Next.js data from __NEXT_DATA__ script
 */
export function extractNextData(html: string): any {
  const scriptRegex = /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  const match = html.match(scriptRegex)

  if (match) {
    try {
      return JSON.parse(match[1])
    } catch {
      return null
    }
  }

  return null
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract schema.org Product data
 */
export interface SchemaProduct {
  name?: string
  description?: string
  image?: string | string[]
  brand?: { name: string }
  offers?: {
    price?: string
    priceCurrency?: string
    availability?: string
  }
  aggregateRating?: {
    ratingValue?: string
    reviewCount?: string
  }
}

export function extractSchemaProduct(html: string): SchemaProduct | null {
  const jsonLd = extractJsonLd(html)

  for (const item of jsonLd) {
    if (item['@type'] === 'Product' || item['@type'] === 'SoftwareApplication') {
      return item as SchemaProduct
    }
  }

  return null
}

/**
 * HTMLRewriter-based selector extraction
 */
export class SelectorExtractor {
  private selectors: Map<string, string[]> = new Map()
  private currentSelector: string | null = null

  constructor(private selectorMap: Record<string, string>) {
    for (const key of Object.keys(selectorMap)) {
      this.selectors.set(key, [])
    }
  }

  element(element: Element) {
    for (const [key, selector] of Object.entries(this.selectorMap)) {
      if (this.matches(element, selector)) {
        this.currentSelector = key
      }
    }
  }

  text(text: Text) {
    if (this.currentSelector) {
      const existing = this.selectors.get(this.currentSelector) || []
      existing.push(text.text)
      this.selectors.set(this.currentSelector, existing)
    }
  }

  getResults(): Record<string, string> {
    const results: Record<string, string> = {}
    for (const [key, values] of this.selectors.entries()) {
      results[key] = values.join(' ').trim()
    }
    return results
  }

  private matches(element: Element, selector: string): boolean {
    // Simple class/id matching
    if (selector.startsWith('.')) {
      const className = selector.slice(1)
      return element.getAttribute('class')?.includes(className) || false
    }
    if (selector.startsWith('#')) {
      const id = selector.slice(1)
      return element.getAttribute('id') === id
    }
    return element.tagName.toLowerCase() === selector.toLowerCase()
  }
}

/**
 * Extract data using HTMLRewriter
 */
export async function extractWithRewriter(
  html: string,
  selectors: Record<string, string>
): Promise<Record<string, string>> {
  const extractor = new SelectorExtractor(selectors)

  const rewriter = new HTMLRewriter()
  for (const selector of Object.values(selectors)) {
    rewriter.on(selector, extractor)
  }

  await rewriter.transform(new Response(html)).text()

  return extractor.getResults()
}
