# Quick Start Guide

Get the data ingestion platform running in 15 minutes.

## Prerequisites

- Cloudflare account
- Node.js 20+ and pnpm installed
- Wrangler CLI: `npm install -g wrangler@latest`

---

## 1. Install & Login (2 min)

```bash
cd /Users/nathanclevenger/Projects/.do/data-ingestion
pnpm install
wrangler login
```

---

## 2. Create Infrastructure (5 min)

```bash
# Create D1 database
wrangler d1 create data-ingestion
# Copy database_id to wrangler.toml files

# Initialize schema
wrangler d1 execute data-ingestion --file=db/d1-minimal-schema.sql

# Create R2 bucket
wrangler r2 bucket create data-ingestion

# Create KV namespace
wrangler kv:namespace create "DATA_CACHE"
# Copy id to wrangler.toml files

# Create queues
wrangler queues create ingestion-queue
wrangler queues create processing-queue
wrangler queues create scraping-queue
wrangler queues create ingestion-dlq
```

---

## 3. Update Configuration (2 min)

Update these files with your IDs:
- `wrangler.toml` (root config)
- `workers/github-ingestion.wrangler.toml`
- `workers/czds-ingestion.wrangler.toml`
- `workers/whois-ingestion.wrangler.toml`
- `workers/theorg-scraper.wrangler.toml`
- `workers/queue-processor-r2.wrangler.toml`

Replace:
- `YOUR_D1_DATABASE_ID` with your D1 database ID
- `YOUR_KV_NAMESPACE_ID` with your KV namespace ID

---

## 4. Set Secrets (3 min)

```bash
# Required for GitHub
wrangler secret put GITHUB_TOKEN
# Create at https://github.com/settings/tokens

# Optional - CZDS (if you have access)
wrangler secret put CZDS_USERNAME
wrangler secret put CZDS_PASSWORD

# Optional - WhoisXML API
wrangler secret put WHOISXML_API_KEY

# Optional - Email discovery
wrangler secret put HUNTER_API_KEY
wrangler secret put CLEARBIT_API_KEY
```

---

## 5. Deploy Workers (3 min)

```bash
# Deploy queue processor first
wrangler deploy --config workers/queue-processor-r2.wrangler.toml

# Deploy ingestion workers
wrangler deploy --config workers/npm-ingestion.wrangler.toml
wrangler deploy --config workers/pypi-ingestion.wrangler.toml
wrangler deploy --config workers/email-pattern-worker.wrangler.toml
wrangler deploy --config workers/github-ingestion.wrangler.toml
wrangler deploy --config workers/czds-ingestion.wrangler.toml
wrangler deploy --config workers/whois-ingestion.wrangler.toml
wrangler deploy --config workers/theorg-scraper.wrangler.toml
```

---

## 6. Test & Run

### Test Endpoints

```bash
# Get your worker URLs from Wrangler output
# They'll be: https://data-ingestion-{name}.{subdomain}.workers.dev

# Test GitHub worker
curl https://data-ingestion-github.{subdomain}.workers.dev/status

# Test NPM worker
curl https://data-ingestion-npm.{subdomain}.workers.dev/status
```

### Trigger Initial Syncs

```bash
# Start GitHub commit search for a domain
curl -X GET "https://data-ingestion-github.{subdomain}.workers.dev/sync/commits?domain=example.com&per_page=100"

# Lookup WHOIS data
curl -X GET "https://data-ingestion-whois.{subdomain}.workers.dev/lookup?domain=example.com"

# Start NPM incremental sync (small test)
curl -X POST "https://data-ingestion-npm.{subdomain}.workers.dev/sync/incremental?limit=100"
```

---

## 7. Monitor

```bash
# Watch logs
wrangler tail data-ingestion-queue-processor

# Check queue depth
wrangler queues list

# Check R2 storage
wrangler r2 object list data-ingestion --prefix=github/

# Check D1 data
wrangler d1 execute data-ingestion --command="SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT 10;"
```

---

## What's Next?

### Production Checklist

- [ ] Set up monitoring alerts
- [ ] Configure all API keys
- [ ] Enable scheduled triggers
- [ ] Run full syncs for NPM/PyPI
- [ ] Configure proxy rotation (optional)
- [ ] Set up cost alerts
- [ ] Review CZDS zone file access

### Common Commands

```bash
# View worker logs
wrangler tail {worker-name}

# Check database
wrangler d1 execute data-ingestion --command="SELECT COUNT(*) FROM ingestion_runs;"

# Check R2 storage size
wrangler r2 object list data-ingestion | wc -l

# Redeploy after changes
wrangler deploy --config workers/{worker-name}.wrangler.toml
```

### Query Data

Once data is processed to Parquet:

```sql
-- NPM packages
SELECT * FROM read_parquet('r2://data-ingestion/npm/**/*.parquet') LIMIT 10;

-- GitHub commits
SELECT * FROM read_parquet('r2://data-ingestion/github/commits/**/*.parquet') LIMIT 10;

-- Email patterns
SELECT * FROM read_parquet('r2://data-ingestion/emails/**/*.parquet') LIMIT 10;
```

---

## Troubleshooting

**Workers not deploying?**
```bash
# Check wrangler version
wrangler --version

# Update wrangler
npm install -g wrangler@latest
```

**Secrets not working?**
```bash
# List secrets
wrangler secret list

# Verify secret is set
wrangler secret put GITHUB_TOKEN  # Re-enter value
```

**Queue backing up?**
```bash
# Check consumer status
curl https://data-ingestion-queue-processor.{subdomain}.workers.dev/status

# Increase batch size in queue-processor-r2.wrangler.toml
```

**Out of D1 storage?**
- D1 is only for operational metadata (<1GB expected)
- Check: `wrangler d1 execute data-ingestion --command="SELECT SUM(length(data)) FROM ingestion_runs;"`
- Clean up: `DELETE FROM ingestion_runs WHERE started_at < datetime('now', '-30 days');`

---

## Cost Estimate

**Minimal setup:**
- Workers Paid: $5/month
- R2 Storage: ~$1/month (first 100GB)
- Queues: ~$1/month
- D1: Free (under 5GB)
- **Total: ~$7/month**

**With full syncs (NPM + PyPI):**
- R2 Storage: ~$12/month (750GB)
- Queues: ~$5/month
- **Total: ~$22/month**

---

## Support

- **Documentation:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for full details
- **Architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- **Issues:** Open issue on GitHub

---

**Setup Time:** 15 minutes
**First Data:** 5 minutes after deployment
**Full NPM Sync:** 6-8 hours
**Full PyPI Sync:** 2-3 hours
