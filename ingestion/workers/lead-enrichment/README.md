# Lead Enrichment API

A high-performance lead enrichment API built on Cloudflare Workers that provides company and person data enrichment using GitHub and WHOIS data sources.

## Features

- ✅ **Person Enrichment** - Enrich individual contacts with GitHub profiles, commit history, and contact information
- ✅ **Company Enrichment** - Enrich companies with domain data, GitHub organizations, and WHOIS information
- ✅ **Bulk Enrichment** - Process up to 100 enrichments in a single request
- ✅ **Search by Domain** - Find all people associated with a specific company domain
- ✅ **Multi-source Confidence Scoring** - Combine data from multiple sources with confidence scores
- ✅ **Real-time Data** - Query fresh data with 7-day cache
- ✅ **API-first** - RESTful API with comprehensive documentation
- ✅ **Rate Limiting** - Fair usage policies with tiered pricing
- ✅ **Edge Computing** - Deploy globally on Cloudflare's network for <100ms latency

## Quick Start

### Prerequisites

- Node.js 20+ and pnpm
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler@latest`

### Installation

```bash
cd workers/lead-enrichment
pnpm install
```

### Configuration

1. Create D1 database:
```bash
wrangler d1 create lead-enrichment
```

2. Update `wrangler.jsonc` with your D1 database ID

3. Initialize database schema:
```bash
wrangler d1 execute lead-enrichment --file=db/schema.sql
```

4. Create KV namespace for rate limiting:
```bash
wrangler kv:namespace create "RATE_LIMIT_KV"
```

5. Update `wrangler.jsonc` with your KV namespace ID

### Development

```bash
# Start local development server
pnpm dev

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Deployment

```bash
# Deploy to production
pnpm deploy
```

## API Endpoints

### Person Enrichment

```http
POST /v1/enrich/person
Authorization: Bearer api_live_xxx
Content-Type: application/json

{
  "email": "john@example.com",
  "github_username": "johndoe"
}
```

**Response:**
```json
{
  "person": {
    "name": "John Doe",
    "email": "john@example.com",
    "emails": [
      {
        "value": "john@example.com",
        "type": "work",
        "source": "github_commits",
        "confidence": 0.95,
        "verified": true
      }
    ],
    "github": {
      "username": "johndoe",
      "url": "https://github.com/johndoe",
      "public_repos": 45,
      "followers": 230
    },
    "confidence_score": 0.92,
    "data_sources": ["github_profile", "github_commits"],
    "last_updated": "2025-10-03T21:15:00Z"
  }
}
```

### Company Enrichment

```http
POST /v1/enrich/company
Authorization: Bearer api_live_xxx
Content-Type: application/json

{
  "domain": "example.com"
}
```

### Bulk Enrichment

```http
POST /v1/enrich/bulk
Authorization: Bearer api_live_xxx
Content-Type: application/json

{
  "type": "person",
  "items": [
    {"email": "john@example.com"},
    {"github_username": "janedoe"}
  ]
}
```

### Search People by Domain

```http
GET /v1/search/people?domain=example.com&limit=50
Authorization: Bearer api_live_xxx
```

### API Status

```http
GET /v1/status
Authorization: Bearer api_live_xxx
```

## Authentication

All API requests require authentication using an API key in the `Authorization` header:

```http
Authorization: Bearer api_live_7k2m9n4p6q8r1s3t5u7v9w0x2y4z
```

API keys have the format:
- Production: `api_live_[32 alphanumeric characters]`
- Testing: `api_test_[32 alphanumeric characters]`

## Rate Limiting

Rate limits are based on your subscription tier:

| Tier | Requests/Min | Requests/Day | Credits/Month | Price |
|------|--------------|--------------|---------------|-------|
| Free | 10 | 100 | 100 | $0 |
| Starter | 60 | 10,000 | 1,000 | $49 |
| Growth | 300 | 50,000 | 5,000 | $149 |
| Pro | 600 | 100,000 | 10,000 | $399 |

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1696377600
X-Credits-Limit: 1000
X-Credits-Used: 125
X-Credits-Remaining: 875
X-Credits-Reset: 1698969600
```

## Data Sources

The API aggregates data from multiple sources:

- **GitHub** - Developer profiles, repositories, commit history (100M+ developers)
- **WHOIS** - Domain registration data, contact information (unlimited domains)
- **Cache** - Previously enriched data (7-day TTL)

## Confidence Scoring

Each enrichment includes a confidence score (0.0 - 1.0) based on:

- **Number of sources** - More sources = higher confidence
- **Source reliability** - GitHub profile (1.0) > WHOIS (0.7)
- **Data freshness** - Recent data gets higher scores
- **Verification** - Email verification adds +0.10 confidence

Example scores:
- 0.95+ - Very high confidence (3+ sources, fresh data, verified)
- 0.85-0.94 - High confidence (2+ sources, recent data)
- 0.70-0.84 - Medium confidence (1-2 sources)
- <0.70 - Low confidence (single stale source)

## Project Structure

```
workers/lead-enrichment/
├── src/
│   ├── index.ts                    # Main entry point + Hono app
│   ├── types.ts                    # TypeScript type definitions
│   ├── routes/                     # API route handlers
│   │   ├── enrich-person.ts
│   │   ├── enrich-company.ts
│   │   ├── enrich-bulk.ts
│   │   ├── search-people.ts
│   │   └── status.ts
│   ├── enrichment/                 # Enrichment engine
│   │   ├── engine.ts               # Durable Object
│   │   ├── github-source.ts        # GitHub data queries
│   │   ├── whois-source.ts         # WHOIS data queries
│   │   ├── aggregator.ts           # Multi-source aggregation
│   │   └── confidence.ts           # Confidence scoring
│   ├── middleware/                 # HTTP middleware
│   │   ├── auth.ts                 # API key authentication
│   │   ├── rate-limit.ts           # Rate limiting
│   │   ├── cors.ts                 # CORS headers
│   │   └── error-handler.ts        # Error handling
│   └── lib/                        # Utility libraries
│       ├── cache.ts                # D1 caching
│       ├── r2-query.ts             # R2 Parquet queries
│       ├── validation.ts           # Zod schemas
│       └── utils.ts                # Helpers
├── tests/
│   ├── integration/
│   ├── unit/
│   └── fixtures/
├── db/
│   └── schema.sql                  # D1 database schema
├── wrangler.jsonc                  # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Type Checking

```bash
pnpm typecheck
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Linting

```bash
pnpm lint
```

## Deployment

### Production

```bash
# Deploy to production
pnpm deploy

# View logs
wrangler tail lead-enrichment-api
```

### Environment Variables

Set these in `wrangler.jsonc`:

- `ENVIRONMENT` - `production` or `development`
- `LOG_LEVEL` - `debug`, `info`, `warn`, or `error`
- `CACHE_TTL_SECONDS` - Cache expiration time (default: 604800 = 7 days)
- `API_VERSION` - API version (default: `v1`)

## Monitoring

### Analytics

View usage analytics in the Cloudflare dashboard:
- Request volume
- Response times (p50, p95, p99)
- Error rates
- Cache hit rates

### Logs

```bash
# Stream logs in real-time
wrangler tail lead-enrichment-api

# Filter by log level
wrangler tail lead-enrichment-api --level error

# Filter by HTTP status
wrangler tail lead-enrichment-api --status 400-599
```

### Database Queries

```bash
# Check API key usage
wrangler d1 execute lead-enrichment --command="SELECT * FROM v_api_key_usage;"

# Check daily usage stats
wrangler d1 execute lead-enrichment --command="SELECT * FROM v_daily_usage ORDER BY date DESC LIMIT 7;"

# Check endpoint performance
wrangler d1 execute lead-enrichment --command="SELECT * FROM v_endpoint_performance;"
```

## Troubleshooting

### Common Issues

**"Invalid API key format"**
- Check that your API key starts with `api_live_` or `api_test_`
- Ensure the key is exactly 40 characters long

**"Rate limit exceeded"**
- You've exceeded your tier's rate limit
- Wait for the reset time (see `X-RateLimit-Reset` header)
- Upgrade your tier for higher limits

**"Insufficient credits"**
- You've used all your monthly credits
- Credits reset on the 1st of each month
- Upgrade your tier for more credits

**"No data found"**
- The person/company doesn't exist in our data sources
- Try enriching with different input (email vs GitHub username)
- Some data may not be publicly available

## Support

- **Documentation**: https://docs.leadenrich.do
- **Email**: support@leadenrich.do
- **Discord**: https://discord.gg/leadenrich
- **GitHub Issues**: https://github.com/dot-do/lead-enrichment/issues

## License

MIT License - see LICENSE file for details

---

**Built with ❤️ using Cloudflare Workers, Hono.js, and TypeScript**
