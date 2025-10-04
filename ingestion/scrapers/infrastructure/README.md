# Infrastructure Setup & Deployment

Scripts and configuration for deploying the software product scraping infrastructure to Cloudflare.

## Overview

This directory contains everything needed to deploy:

- **R2 Buckets** - Data storage
- **Workers Queues** - Message batching
- **KV Namespaces** - Rate limiting state
- **3 Scrapers** - G2, Product Hunt, Hacker News
- **1 Queue Processor** - Batch processing to R2

## Prerequisites

1. **Cloudflare Account** with Workers Paid plan ($5/month)
2. **Wrangler CLI** installed:
   ```bash
   npm install -g wrangler@latest
   ```
3. **Authenticated** with Cloudflare:
   ```bash
   wrangler login
   ```
4. **Dependencies** installed:
   ```bash
   cd data-ingestion/scrapers
   pnpm install
   ```

## Quick Start

### 1. Deploy Infrastructure

```bash
cd infrastructure
chmod +x *.sh
./deploy-all.sh
```

This will:
- ✅ Create R2 buckets
- ✅ Create Workers Queues
- ✅ Create KV namespaces
- ✅ Deploy queue processor
- ✅ Deploy all 3 scrapers

**⚠️ Important:** When prompted, update `wrangler.toml` files with KV namespace IDs:

```bash
wrangler kv:namespace list
# Copy the 'id' values to each wrangler.toml
```

### 2. Set Secrets (Optional)

**Product Hunt API Token:**
```bash
cd producthunt
wrangler secret put PRODUCTHUNT_API_TOKEN
# Enter your token from https://api.producthunt.com/v2/oauth/applications
```

**GitHub Token (for future GitHub scraper):**
```bash
wrangler secret put GITHUB_TOKEN
# Enter your GitHub PAT
```

### 3. Test Scrapers

```bash
cd infrastructure
./test-scrapers.sh
```

This will:
- Test each scraper with small batches
- Verify queue processing
- Check R2 bucket contents

## Infrastructure Components

### R2 Buckets

**software-products** (main data storage)
```
software-products/
├── g2/
│   └── year=2025/month=10/day=03/
│       └── category=crm/
│           └── batch_1728000000_abc123.ndjson
├── producthunt/
│   └── trending/year=2025/...
└── hackernews/
    └── year=2025/...
```

**software-products-raw** (debugging)
```
software-products-raw/
└── raw/
    ├── g2/2025-10-03/
    ├── producthunt/2025-10-03/
    └── hackernews/2025-10-03/
```

### Workers Queues

**software-ingestion-queue** (main)
- Max batch size: 10 messages
- Max batch timeout: 30 seconds
- Max retries: 3
- Dead letter queue: software-ingestion-dlq

**software-ingestion-dlq** (failed messages)
- Manual inspection required
- Retry after fixing issues

### KV Namespace

**SCRAPER_KV**
- Rate limiting counters
- Scraper state (last run, sequences)
- Processor statistics

## Deployed Workers

### 1. g2-scraper-01

**URL:** `https://g2-scraper-01.YOUR_SUBDOMAIN.workers.dev`

**Endpoints:**
- `/scrape?worker=1&limit=100` - Scrape products
- `/product?slug=salesforce` - Scrape single product
- `/status` - Get scraper status

**Cron:** Daily at 2am UTC

### 2. producthunt-scraper

**URL:** `https://producthunt-scraper.YOUR_SUBDOMAIN.workers.dev`

**Endpoints:**
- `/scrape?timeframe=daily&limit=50` - Scrape trending
- `/product?id=12345` - Scrape single product
- `/status` - Get scraper status

**Cron:** Daily at 3am UTC

### 3. hackernews-scraper

**URL:** `https://hackernews-scraper.YOUR_SUBDOMAIN.workers.dev`

**Endpoints:**
- `/scrape?type=show_hn&limit=100&days=7` - Scrape Show HN
- `/item?id=12345` - Scrape single item
- `/status` - Get scraper status

**Cron:** Daily at 4am UTC

### 4. queue-processor

**URL:** `https://queue-processor.YOUR_SUBDOMAIN.workers.dev`

**Endpoints:**
- `/status` - Get processor statistics

**Trigger:** Queue consumer (automatic)

## Manual Operations

### Create Infrastructure Manually

**R2 Buckets:**
```bash
wrangler r2 bucket create software-products
wrangler r2 bucket create software-products-raw
```

**Queues:**
```bash
wrangler queues create software-ingestion-queue
wrangler queues create software-ingestion-dlq
```

**KV Namespace:**
```bash
wrangler kv:namespace create "SCRAPER_KV"
wrangler kv:namespace create "SCRAPER_KV" --preview
```

### Deploy Individual Workers

**G2 Scraper:**
```bash
cd g2
wrangler deploy
```

**Product Hunt:**
```bash
cd producthunt
wrangler deploy
```

**Hacker News:**
```bash
cd hackernews
wrangler deploy
```

**Queue Processor:**
```bash
cd queue-processor
wrangler deploy
```

### Monitor Workers

**Tail Logs:**
```bash
wrangler tail g2-scraper-01
wrangler tail producthunt-scraper
wrangler tail hackernews-scraper
wrangler tail queue-processor
```

**Queue Status:**
```bash
wrangler queues list
wrangler queues consumer software-ingestion-queue
```

**R2 Contents:**
```bash
wrangler r2 object list software-products --limit 100
wrangler r2 object get software-products/g2/year=2025/month=10/day=03/category=crm/batch_xyz.ndjson
```

**KV Contents:**
```bash
wrangler kv:key list --namespace-id=YOUR_NAMESPACE_ID
wrangler kv:key get "processor:total_processed" --namespace-id=YOUR_NAMESPACE_ID
```

## Scaling Up

### Deploy All 20 G2 Workers

```bash
for i in {1..20}; do
  worker_num=$(printf '%02d' $i)
  cd g2
  sed "s/g2-scraper-01/g2-scraper-${worker_num}/g" wrangler.toml > wrangler-${worker_num}.toml
  sed -i '' "s/WORKER_NUMBER = \"1\"/WORKER_NUMBER = \"${i}\"/g" wrangler-${worker_num}.toml
  wrangler deploy --config wrangler-${worker_num}.toml
  cd ..
done
```

### Deploy Remaining Scrapers

After implementing Capterra, GitHub, etc.:

```bash
cd capterra
wrangler deploy

cd ../github
wrangler deploy

# etc.
```

## Troubleshooting

### Workers Not Deploying

**Check authentication:**
```bash
wrangler whoami
```

**Check account ID:**
```bash
wrangler whoami
# Copy account_id to wrangler.toml
```

### Queue Not Processing

**Check queue status:**
```bash
wrangler queues list
wrangler queues consumer software-ingestion-queue
```

**Check processor logs:**
```bash
wrangler tail queue-processor
```

**Retry failed messages:**
```bash
# Messages in DLQ need manual intervention
wrangler queues consumer software-ingestion-dlq
```

### Rate Limiting Issues

**Check KV namespace:**
```bash
wrangler kv:key list --namespace-id=YOUR_NAMESPACE_ID
```

**Clear rate limit counters:**
```bash
# Get all keys starting with "ratelimit:"
wrangler kv:key delete "ratelimit:g2:second:1728000000" --namespace-id=YOUR_NAMESPACE_ID
```

### Data Not Appearing in R2

**Check queue processor:**
```bash
curl https://queue-processor.YOUR_SUBDOMAIN.workers.dev/status
```

**Check R2 bucket:**
```bash
wrangler r2 object list software-products
```

**Check worker logs:**
```bash
wrangler tail queue-processor
```

## Cost Estimates

### Workers

- **Free tier:** 100,000 requests/day
- **Paid:** $5/month + $0.50/million requests
- **Our usage:** ~10K requests/day (well under free tier)

### R2

- **Storage:** $0.015/GB/month
- **Class A (writes):** $4.50/million operations
- **Class B (reads):** $0.36/million operations
- **Our usage:** ~10GB storage = $0.15/month

### Queues

- **Free tier:** 1 million operations/month
- **Our usage:** ~100K operations/day (well under free tier)

### KV

- **Free tier:** 100K reads/day, 1K writes/day, 1GB storage
- **Our usage:** ~10K reads/day (rate limiting checks)

### **Total: ~$5.15/month**

(Workers Paid plan + R2 storage)

## Security

### Secrets Management

- Use `wrangler secret put` for all API keys
- Never commit secrets to git
- Rotate keys quarterly

### Rate Limiting

- Configured per scraper in `ScraperConfig`
- KV-based counters prevent abuse
- Automatic backoff on 429 responses

### Access Control

- Workers are public (HTTP endpoints)
- Implement authentication if needed
- Use Custom Domains + Cloudflare Access for production

## Monitoring

### Cloudflare Dashboard

- Workers > Analytics - Request rates, errors, CPU time
- R2 > software-products - Storage usage, operations
- Queues > software-ingestion-queue - Message rates, backlog

### Analytics Engine

Optional integration for detailed metrics:

```typescript
env.ANALYTICS.writeDataPoint({
  blobs: ['scraper-name', 'source'],
  doubles: [scraped, queued, errors],
  indexes: ['source'],
})
```

Query via GraphQL API or Cloudflare dashboard.

## Cleanup

### Delete All Infrastructure

**⚠️ Warning: This will delete all data!**

```bash
# Delete workers
wrangler delete g2-scraper-01
wrangler delete producthunt-scraper
wrangler delete hackernews-scraper
wrangler delete queue-processor

# Delete queues
wrangler queues delete software-ingestion-queue
wrangler queues delete software-ingestion-dlq

# Delete R2 buckets (only if empty)
wrangler r2 bucket delete software-products
wrangler r2 bucket delete software-products-raw

# Delete KV namespace
wrangler kv:namespace delete --namespace-id=YOUR_NAMESPACE_ID
```

## Next Steps

After successful deployment:

1. **Monitor first run** - Check logs, verify data in R2
2. **Tune rate limits** - Adjust if hitting 429s
3. **Deploy remaining scrapers** - Capterra, GitHub, etc.
4. **Set up monitoring dashboard** - In services.studio
5. **Launch Phase 2** - Deploy analysis agents

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [R2 Documentation](https://developers.cloudflare.com/r2/)
- [Workers Queues Docs](https://developers.cloudflare.com/queues/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

