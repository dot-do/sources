# Software Product Scrapers

Massively parallel scrapers for collecting 50,000+ software products from 10+ sources.

## Overview

This directory contains specialized scrapers for various software review and discovery platforms:

- **G2** (20 workers) - 2,000+ categories, enterprise software
- **Capterra** (15 workers) - 900+ categories, SMB software
- **Product Hunt** (5 workers) - Trending/featured products
- **Hacker News** (3 workers) - Show HN, hiring mentions
- **GitHub Trending** (5 workers) - Popular repos by language
- **TrustRadius, Software Advice, GetApp** (10 workers) - Alternative sources

**Total: 58 parallel workers**

## Architecture

### Base Scraper

All scrapers extend `BaseScraper` which provides:

- ✅ Rate limiting (per-second and per-minute)
- ✅ Retry logic with exponential backoff
- ✅ Data validation using Zod schemas
- ✅ Queue integration
- ✅ Metrics tracking
- ✅ Raw data backup to R2

### Data Flow

```
Scraper Worker
    ↓ (HTTP/API fetch)
Parse & Validate (Zod)
    ↓
Queue Message
    ↓
Queue Processor
    ↓
R2 Storage (NDJSON → Parquet)
```

## Scrapers

### G2 Scraper

**Workers:** 20 (categories 1-100 each)

**Coverage:** 2,000+ categories including:
- CRM & Sales
- Marketing & Analytics
- Project Management
- Finance & Accounting
- HR & Recruiting
- Collaboration
- IT & DevOps
- Customer Support
- E-Commerce

**Approach:**
1. List products in category (paginated)
2. Extract product URLs
3. Scrape individual product pages
4. Parse HTML + structured data (JSON-LD, Open Graph)
5. Queue for processing

**Rate Limits:**
- 2 requests/second
- 60 requests/minute

**Data Extracted:**
- Name, description, tagline
- Category, tags, features
- Pricing (tiers, starting price)
- Reviews (rating, count)
- Screenshots, logo
- Vendor information
- Integrations

### Product Hunt Scraper

**Workers:** 5 (by timeframe/topic)

**API:** GraphQL v2 (OAuth)

**Coverage:**
- Daily/weekly/monthly trending
- Topics: AI, DevTools, SaaS, Mobile, etc.
- Featured products
- Maker information

**Approach:**
1. Query GraphQL API with filters
2. Paginate through results
3. Extract structured data (already JSON)
4. Queue for processing

**Rate Limits:**
- 5 requests/second
- 100 requests/minute

**Data Extracted:**
- Name, tagline, description
- Topics (categories)
- Upvotes, comments
- Launch date
- Makers, hunter
- Pricing type
- Screenshots

### Hacker News Scraper

**Workers:** 3 (Show HN, hiring, front page)

**API:** Algolia HN Search API

**Coverage:**
- Show HN posts (product launches)
- Who is Hiring mentions
- Front page stories

**Approach:**
1. Query Algolia API
2. Filter by tags/date range
3. Parse title/text for product info
4. Queue for processing

**Rate Limits:**
- 10 requests/second
- 200 requests/minute (Algolia is generous)

**Data Extracted:**
- Name (from title pattern)
- Description (story text)
- Points, comments
- Tags (extracted from text)
- Platforms (detected from text)

### GitHub Trending Scraper

**Workers:** 5 (by language)

**API:** GitHub REST API v3

**Coverage:**
- Trending repos (daily/weekly/monthly)
- Languages: JavaScript, Python, Go, Rust, TypeScript
- Stars, forks, issues
- Topics, description

**Approach:**
1. Fetch trending repos via search API
2. Get repo details
3. Extract README content
4. Queue for processing

**Rate Limits:**
- Authenticated: 5,000 requests/hour
- Per-second: ~1 request/second

**Data Extracted:**
- Name, description
- Language, topics
- Stars, forks, issues
- README (as description)
- License, contributors
- Open source flag

## Development

### Setup

```bash
cd data-ingestion/scrapers
pnpm install
```

### Environment Variables

Create `.dev.vars`:

```bash
# Required for all scrapers
INGESTION_QUEUE=<queue-name>

# Product Hunt (optional but recommended)
PRODUCTHUNT_API_TOKEN=<your-token>

# GitHub (optional but recommended)
GITHUB_TOKEN=<your-pat>

# Proxy (optional)
PROXY_URL=<proxy-endpoint>
```

### Local Development

Test individual scrapers:

```bash
# G2 scraper (worker 1)
wrangler dev g2/scraper.ts

# Product Hunt scraper
wrangler dev producthunt/scraper.ts

# Hacker News scraper
wrangler dev hackernews/scraper.ts
```

### Testing Endpoints

**G2:**
```bash
curl "http://localhost:8787/scrape?worker=1&limit=10"
curl "http://localhost:8787/product?slug=salesforce"
curl "http://localhost:8787/status"
```

**Product Hunt:**
```bash
curl "http://localhost:8787/scrape?timeframe=daily&limit=50"
curl "http://localhost:8787/product?id=12345"
```

**Hacker News:**
```bash
curl "http://localhost:8787/scrape?type=show_hn&limit=100&days=7"
curl "http://localhost:8787/item?id=12345"
```

## Deployment

### Deploy Individual Scraper

```bash
wrangler deploy g2/scraper.ts --name g2-scraper-01
```

### Deploy All Scrapers

```bash
pnpm deploy:all
```

### Deploy G2 Workers (1-20)

```bash
for i in {1..20}; do
  wrangler deploy g2/scraper.ts --name "g2-scraper-$(printf '%02d' $i)" \
    --var WORKER_NUMBER=$i
done
```

### Scheduled Triggers

Scrapers run automatically via cron:

- **G2:** Daily at 2am UTC (each worker)
- **Product Hunt:** Daily at 3am UTC
- **Hacker News:** Daily at 4am UTC
- **GitHub:** Daily at 5am UTC

Configure in `wrangler.toml` or Cloudflare dashboard.

## Configuration

### Rate Limiting

Adjust in scraper constructor:

```typescript
const config: ScraperConfig = {
  name: 'my-scraper',
  version: '1.0.0',
  source: 'mysource',
  rateLimit: {
    requestsPerSecond: 2,
    requestsPerMinute: 60,
  },
  retries: {
    maxAttempts: 3,
    backoffMs: 1000,
  },
}
```

### Worker Assignment

**G2 categories** are divided across 20 workers (100 categories each):

```typescript
import { getCategoriesForWorker } from './g2/categories'

const categories = getCategoriesForWorker(workerNumber)
```

### Data Validation

All products validated with Zod schema before queuing:

```typescript
import { ProductSchema } from '../schemas/product'

const product = ProductSchema.parse(rawData)
```

## Monitoring

### Metrics

Each scraper tracks:

- **Scraped:** Products successfully scraped
- **Queued:** Products sent to queue
- **Errors:** Failed requests/parsing
- **Uptime:** Time since start

### Analytics Engine

Metrics written to Cloudflare Analytics Engine:

```typescript
env.ANALYTICS.writeDataPoint({
  blobs: [scraper.name, scraper.source],
  doubles: [scraped, queued, errors],
  indexes: [source],
})
```

### Dashboards

View in services.studio Jobs panel or Cloudflare Analytics.

## Performance

### Expected Throughput

- **G2:** 1,000 products/day/worker × 20 = 20,000/day
- **Capterra:** 1,000 products/day/worker × 15 = 15,000/day
- **Product Hunt:** 500 products/day × 5 = 2,500/day
- **Hacker News:** 200 products/day × 3 = 600/day
- **GitHub:** 500 products/day × 5 = 2,500/day

**Total: ~40,000 products/day**

**Target: 50,000 products in 1-2 days**

### Costs

- **Workers:** Free tier (under 10M requests/day)
- **R2 Storage:** ~$0.15/month (10GB)
- **Queue:** Free tier
- **APIs:** Free (GitHub PAT, HN Algolia, etc.)

**Total: ~$0.15/month** 🎉

## Troubleshooting

### Rate Limiting Issues

If hit rate limits:

1. Reduce `requestsPerSecond` in config
2. Add delays between batches
3. Use proxy rotation (Bright Data, Smartproxy)

### Parsing Errors

Check raw HTML saved to R2:

```bash
wrangler r2 object get software-products/raw/g2/2025-10-03/crm-salesforce.json
```

### Queue Backlog

Monitor queue depth:

```bash
wrangler queues list
wrangler queues consumer <queue-id>
```

Increase queue consumers if backlog grows.

### Validation Errors

Common issues:

- Missing required fields (name, url, source)
- Invalid URLs
- Pricing format mismatches

Fix in scraper parsing logic.

## Extending

### Add New Scraper

1. Create directory: `scrapers/newsource/`
2. Implement scraper extending `BaseScraper`
3. Add to `package.json` scripts
4. Deploy with `wrangler deploy`

Example:

```typescript
import { BaseScraper, ScraperConfig } from '../shared/base-scraper'

export class MyNewScraper extends BaseScraper {
  constructor(env: ScraperEnv) {
    super({
      name: 'mynew-scraper',
      version: '1.0.0',
      source: 'mynew',
      rateLimit: { requestsPerSecond: 5, requestsPerMinute: 200 },
      retries: { maxAttempts: 3, backoffMs: 1000 },
    }, env)
  }

  async scrape(options?: any): Promise<Product[]> {
    // Implementation
  }

  async scrapeSingle(id: string): Promise<Product | null> {
    // Implementation
  }
}
```

## Resources

- [G2 Robots.txt](https://www.g2.com/robots.txt)
- [Product Hunt API Docs](https://api.producthunt.com/v2/docs)
- [HN Algolia API](https://hn.algolia.com/api)
- [GitHub API Docs](https://docs.github.com/en/rest)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)

## License

Private - Internal use only

