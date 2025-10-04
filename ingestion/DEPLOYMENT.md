# Data Ingestion Platform - Deployment Guide

Complete deployment guide for the data ingestion platform on Cloudflare.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Workers    │    │   Queues     │    │   R2 Bucket  │  │
│  │              │───▶│              │───▶│              │  │
│  │ - npm        │    │ - ingestion  │    │ data-        │  │
│  │ - pypi       │    │ - processing │    │ ingestion/   │  │
│  │ - email      │    │ - scraping   │    │              │  │
│  │ - github     │    │              │    │ - npm/       │  │
│  │ - czds       │    └──────────────┘    │ - pypi/      │  │
│  │ - whois      │                        │ - github/    │  │
│  │ - theorg     │                        │ - domains/   │  │
│  └──────────────┘                        │ - whois/     │  │
│                                           │ - orgs/      │  │
│  ┌──────────────┐    ┌──────────────┐    └──────────────┘  │
│  │   D1 (ops)   │    │   KV Store   │                       │
│  │              │    │              │                       │
│  │ - runs       │    │ - cache      │    ┌──────────────┐  │
│  │ - sync_state │    │ - tokens     │    │  Pipelines   │  │
│  │ - failures   │    │ - sessions   │    │              │  │
│  └──────────────┘    └──────────────┘    │ NDJSON→      │  │
│                                           │ Parquet      │  │
│  ┌──────────────┐                        └──────────────┘  │
│  │  Container   │                                           │
│  │              │    ┌──────────────┐                       │
│  │ - Playwright │    │  Analytics   │                       │
│  │ - Scrapy     │    │  Engine      │                       │
│  │ - Proxies    │    │              │                       │
│  └──────────────┘    └──────────────┘                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Cloudflare Products

1. **Cloudflare Workers** (Paid: $5/month)
   - Required for all workers
   - 10M requests/month included

2. **Cloudflare R2** (Pay-as-you-go)
   - Primary data storage
   - Cost: ~$0.015/GB/month storage
   - Estimated: $12/month for 750GB

3. **Cloudflare D1** (Free tier sufficient)
   - Operational metadata only
   - Free: 5GB storage, 5M reads/day
   - We'll use <1GB

4. **Cloudflare Queues** (Paid: $0.40/million messages)
   - Message processing
   - Estimated: $5/month

5. **Cloudflare KV** (Included with Workers)
   - Caching layer
   - Free: 100k reads/day, 1k writes/day

6. **Cloudflare Pipelines** (Beta - Free)
   - NDJSON → Parquet conversion
   - Currently in beta

7. **Cloudflare Container** (Optional: ~$10/month)
   - For heavy browser automation
   - Only needed for advanced scraping

### External Services (Optional)

1. **GitHub Token** (Free)
   - For GitHub API access
   - 5,000 req/hour with token

2. **CZDS Account** (Free, approval required)
   - For zone file access
   - Apply at czds.icann.org

3. **WhoisXML API** (Optional: $50-200/month)
   - For reliable WHOIS data
   - Free tier: 500 queries/month

4. **Hunter.io API** (Optional: $49/month)
   - Email pattern discovery
   - Free tier: 25 searches/month

5. **Clearbit API** (Optional: $99/month)
   - Organization enrichment

6. **Proxy Service** (Optional: $100-500/month)
   - Bright Data, Smartproxy, or IPRoyal
   - Only needed for heavy scraping

---

## Step 1: Initial Setup

### 1.1 Install Wrangler CLI

```bash
npm install -g wrangler@latest
wrangler login
```

### 1.2 Create D1 Database

```bash
cd /Users/nathanclevenger/Projects/.do/data-ingestion

# Create database
wrangler d1 create data-ingestion

# Copy the database_id from output
# Update wrangler.toml with the database_id

# Initialize schema
wrangler d1 execute data-ingestion --file=db/d1-minimal-schema.sql
```

### 1.3 Create R2 Bucket

```bash
# Create bucket
wrangler r2 bucket create data-ingestion

# Verify
wrangler r2 bucket list
```

### 1.4 Create KV Namespace

```bash
# Create KV namespace
wrangler kv:namespace create "DATA_CACHE"

# Copy the id from output
# Update wrangler.toml with the id
```

### 1.5 Create Queues

```bash
# Create queues
wrangler queues create ingestion-queue
wrangler queues create processing-queue
wrangler queues create scraping-queue
wrangler queues create ingestion-dlq
```

### 1.6 Create Pipeline

```bash
# Create pipeline via Cloudflare Dashboard or API
# Currently in beta - documentation at:
# https://developers.cloudflare.com/pipelines/
```

---

## Step 2: Configure Secrets

Set all API keys and credentials as Worker secrets:

```bash
# GitHub
wrangler secret put GITHUB_TOKEN
# Paste your GitHub personal access token

# CZDS
wrangler secret put CZDS_USERNAME
wrangler secret put CZDS_PASSWORD

# WhoisXML API (optional)
wrangler secret put WHOISXML_API_KEY

# Hunter.io (optional)
wrangler secret put HUNTER_API_KEY

# Clearbit (optional)
wrangler secret put CLEARBIT_API_KEY

# Proxy credentials (optional)
wrangler secret put PROXY_USER
wrangler secret put PROXY_PASS
```

---

## Step 3: Deploy Workers

### 3.1 Build Project

```bash
pnpm install
pnpm build
```

### 3.2 Deploy NPM Worker

```bash
wrangler deploy --config workers/npm-ingestion.wrangler.toml
```

Create `workers/npm-ingestion.wrangler.toml`:
```toml
name = "data-ingestion-npm"
main = "workers/npm-ingestion.ts"
compatibility_date = "2025-10-03"

[[d1_databases]]
binding = "DB"
database_name = "data-ingestion"
database_id = "YOUR_D1_DATABASE_ID"

[[r2_buckets]]
binding = "DATA_BUCKET"
bucket_name = "data-ingestion"

[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"

[[queues.producers]]
binding = "INGESTION_QUEUE"
queue = "ingestion-queue"

[[analytics_engine_datasets]]
binding = "ANALYTICS"

[triggers]
crons = ["0 */6 * * *"]  # Every 6 hours
```

### 3.3 Deploy Other Workers

Repeat for each worker:
- PyPI: `workers/pypi-ingestion.wrangler.toml`
- Email: `workers/email-pattern-worker.wrangler.toml`
- GitHub: `workers/github-ingestion.wrangler.toml`
- CZDS: `workers/czds-ingestion.wrangler.toml`
- WHOIS: `workers/whois-ingestion.wrangler.toml`
- TheOrg: `workers/theorg-scraper.wrangler.toml`
- Queue Processor: `workers/queue-processor-r2.wrangler.toml`

### 3.4 Set Up Cron Schedules

Configure scheduled triggers in each worker's wrangler.toml:

**NPM:** Every 6 hours (incremental sync)
```toml
[triggers]
crons = ["0 */6 * * *"]
```

**PyPI:** Daily at midnight
```toml
[triggers]
crons = ["0 0 * * *"]
```

**GitHub:** Every 4 hours (commit search)
```toml
[triggers]
crons = ["0 */4 * * *"]
```

**CZDS:** Daily at 2 AM (zone files)
```toml
[triggers]
crons = ["0 2 * * *"]
```

**WHOIS:** Daily at 3 AM (expiring domains)
```toml
[triggers]
crons = ["0 3 * * *"]
```

**TheOrg:** Weekly on Monday at 1 AM
```toml
[triggers]
crons = ["0 1 * * 1"]
```

---

## Step 4: Deploy Container (Optional)

For heavy scraping with Playwright:

### 4.1 Build Container

```bash
docker build -t data-ingestion-scraper .
```

### 4.2 Push to Registry

```bash
# Tag for your container registry
docker tag data-ingestion-scraper:latest YOUR_REGISTRY/data-ingestion-scraper:latest

# Push
docker push YOUR_REGISTRY/data-ingestion-scraper:latest
```

### 4.3 Deploy to Cloudflare Container

```bash
# Create container app via Cloudflare Dashboard
# Or use API:
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/containers" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "data-ingestion-scraper",
    "image": "YOUR_REGISTRY/data-ingestion-scraper:latest",
    "env": {
      "NODE_ENV": "production"
    }
  }'
```

---

## Step 5: Initial Data Sync

### 5.1 Trigger Full Syncs

```bash
# NPM (will take ~6 hours for 2.5M packages)
curl -X POST https://data-ingestion-npm.YOUR_SUBDOMAIN.workers.dev/sync/full

# PyPI (will take ~2 hours for 500K packages)
curl -X POST https://data-ingestion-pypi.YOUR_SUBDOMAIN.workers.dev/sync/full

# GitHub - Configure domains to monitor
curl -X POST https://data-ingestion-github.YOUR_SUBDOMAIN.workers.dev/config/domains \
  -H "Content-Type: application/json" \
  -d '{"domains": ["example.com", "acme.com"]}'

# CZDS - List available zones
curl https://data-ingestion-czds.YOUR_SUBDOMAIN.workers.dev/sync/list

# CZDS - Bulk download (select TLDs you have access to)
curl -X POST https://data-ingestion-czds.YOUR_SUBDOMAIN.workers.dev/sync/bulk \
  -H "Content-Type: application/json" \
  -d '{"tlds": ["com", "net", "org"]}'
```

### 5.2 Monitor Progress

```bash
# Check ingestion runs
curl https://data-ingestion-npm.YOUR_SUBDOMAIN.workers.dev/status

# Check queue depth
wrangler queues list

# Check R2 storage
wrangler r2 object list data-ingestion --prefix=npm/
```

---

## Step 6: Configure Monitoring

### 6.1 Set Up Alerts

Create alerts in Cloudflare Dashboard:

1. **Worker Errors**
   - Threshold: >10 errors/minute
   - Action: Email notification

2. **Queue Depth**
   - Threshold: >10,000 messages
   - Action: Email notification

3. **D1 Storage**
   - Threshold: >1GB (approaching limit)
   - Action: Email notification

4. **R2 Storage**
   - Threshold: >100GB (cost control)
   - Action: Email notification

### 6.2 Analytics Dashboard

Access Analytics Engine data:

```bash
# Query analytics via GraphQL
curl -X POST "https://api.cloudflare.com/client/v4/graphql" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "query": "query { analytics { ... } }"
  }'
```

---

## Step 7: Query Data with R2 SQL

Once data is ingested and converted to Parquet:

```sql
-- List NPM packages with >1M downloads
SELECT name, version, downloads_total
FROM read_parquet('r2://data-ingestion/npm/**/*.parquet')
WHERE downloads_total > 1000000
ORDER BY downloads_total DESC
LIMIT 100;

-- Find GitHub commits by domain
SELECT author_email, COUNT(*) as commit_count
FROM read_parquet('r2://data-ingestion/github/commits/**/*.parquet')
WHERE author_email LIKE '%@example.com'
GROUP BY author_email
ORDER BY commit_count DESC;

-- High-confidence email patterns
SELECT domain, pattern, confidence
FROM read_parquet('r2://data-ingestion/emails/**/*.parquet')
WHERE confidence > 0.8
ORDER BY confidence DESC;

-- Domains with DNSSEC enabled
SELECT domain, tld, dnssec_enabled
FROM read_parquet('r2://data-ingestion/domains/**/*.parquet')
WHERE dnssec_enabled = true
LIMIT 100;

-- Organizations by employee count
SELECT name, industry, employee_count, country
FROM read_parquet('r2://data-ingestion/orgs/**/*.parquet')
WHERE employee_count > 100
ORDER BY employee_count DESC;
```

---

## Step 8: Maintenance

### Daily Tasks

```bash
# Check ingestion run status
curl https://data-ingestion-npm.YOUR_SUBDOMAIN.workers.dev/status

# Monitor queue health
wrangler queues list

# Review failed messages
curl https://YOUR_SUBDOMAIN.workers.dev/admin/failed-messages
```

### Weekly Tasks

```bash
# Run health checks
curl https://data-ingestion-npm.YOUR_SUBDOMAIN.workers.dev/health

# Review analytics
# Access Cloudflare Dashboard → Analytics

# Check R2 storage growth
wrangler r2 object list data-ingestion | wc -l

# Review costs
# Access Cloudflare Dashboard → Billing
```

### Monthly Tasks

```bash
# Cleanup old data (optional)
# Delete partitions older than 90 days
wrangler r2 object delete data-ingestion --prefix=npm/year=2024/month=01/

# Optimize D1 database
wrangler d1 execute data-ingestion --command="VACUUM;"

# Review and update proxy configurations
# Rotate proxy credentials if needed

# Update dependencies
pnpm update
wrangler deploy
```

---

## Troubleshooting

### Issue: Worker throwing errors

```bash
# Check logs
wrangler tail data-ingestion-npm

# Check recent errors
curl https://data-ingestion-npm.YOUR_SUBDOMAIN.workers.dev/status
```

### Issue: Queue backing up

```bash
# Check queue depth
wrangler queues list

# Check consumer status
curl https://YOUR_SUBDOMAIN.workers.dev/admin/queue-status

# Increase consumer concurrency in wrangler.toml
# [[queues.consumers]]
# max_batch_size = 20  # Increase from 10
```

### Issue: High R2 costs

```bash
# Check storage usage
wrangler r2 object list data-ingestion --prefix=npm/ | wc -l

# Delete old data
# Implement lifecycle policies
```

### Issue: Rate limiting from APIs

```bash
# Check rate limit status
curl https://api.github.com/rate_limit

# Configure proxy rotation
# Update PROXY_USER and PROXY_PASS secrets

# Reduce cron frequency in wrangler.toml
```

---

## Cost Estimates

### Monthly Costs (Estimated)

| Service | Usage | Cost |
|---------|-------|------|
| Workers (Paid) | Base plan | $5.00 |
| R2 Storage | 750GB | $11.25 |
| R2 Operations | 100M reads | $0.40 |
| Queues | 10M messages | $4.00 |
| D1 | <1GB (free tier) | $0.00 |
| KV | Free tier | $0.00 |
| Pipelines | Beta (free) | $0.00 |
| Container (optional) | 1 instance | $10.00 |
| **Subtotal (Cloudflare)** | | **$20.65** |
| | | |
| WhoisXML API (optional) | 10k queries | $50.00 |
| Hunter.io (optional) | Basic plan | $49.00 |
| Proxy Service (optional) | Residential | $200.00 |
| **Total with APIs** | | **$319.65/mo** |

---

## Security Best Practices

1. **Use Secrets for All Credentials**
   - Never commit API keys to git
   - Use `wrangler secret put`

2. **Implement Rate Limiting**
   - Respect API rate limits
   - Use proxy rotation for scraping

3. **Validate Input**
   - Sanitize user input
   - Validate queue messages

4. **Monitor Access**
   - Review D1 queries
   - Monitor R2 access patterns

5. **Rotate Credentials**
   - Update secrets monthly
   - Rotate proxy credentials regularly

---

## Next Steps

1. ✅ Deploy infrastructure (D1, R2, KV, Queues)
2. ✅ Configure secrets and API keys
3. ✅ Deploy all workers
4. ✅ Set up cron schedules
5. ✅ Trigger initial full syncs
6. ✅ Monitor progress and health
7. ✅ Configure alerts
8. ✅ Set up cost monitoring
9. ✅ Document queries and usage patterns
10. ✅ Plan data retention policies

---

**Last Updated:** 2025-10-03
**Deployment Status:** Ready for Production
**Estimated Setup Time:** 2-3 hours
