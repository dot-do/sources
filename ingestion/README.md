# Data Ingestion Platform

Scalable data ingestion platform for collecting, processing, and storing data from multiple sources using Cloudflare's edge infrastructure.

## 🎯 Overview

This platform ingests data from:
- **NPM Registry** - 2.5M+ packages (metadata, dependencies, downloads)
- **PyPI** - 500K+ Python packages
- **GitHub** - User profiles, repositories, and commits (email extraction)
- **CZDS** - TLD zone files (DNS records for all domains)
- **WHOIS** - Domain registration data (RDAP & legacy protocols)
- **TheOrg** - Organization structure and people data
- **Email Patterns** - Aggregated from Hunter.io, Clearbit, and GitHub

## 🏗️ Architecture

### R2-First Storage Design

```
┌────────────────────────────────────────────────────────────┐
│                    Data Flow                                │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  Source APIs     Workers        Queues       R2 Storage     │
│  ───────────    ─────────    ─────────    ──────────────    │
│                                                              │
│  NPM API  ─────▶ NPM       ─────────────▶                   │
│                  Worker    ─────────────▶                   │
│                                          ▶ NDJSON Files     │
│  PyPI API ─────▶ PyPI      ─────────────▶  (batched)       │
│                  Worker    ─────────────▶                   │
│                                          ▶ Parquet Files    │
│  GitHub   ─────▶ GitHub    ─────────────▶  (via Pipelines) │
│  API            Worker      Queue        ▶                  │
│                             Processor    ▶ year=YYYY/       │
│  CZDS API ─────▶ CZDS      ─────────────▶  month=MM/       │
│                  Worker    ─────────────▶  day=DD/          │
│                                          ▶                   │
│  WHOIS    ─────▶ WHOIS     ─────────────▶ R2 Data          │
│  RDAP           Worker     ─────────────▶ Catalog          │
│                                          ▶                   │
│  TheOrg   ─────▶ Scraper   ─────────────▶ R2 SQL           │
│  Website        Worker     ─────────────▶ Queries          │
│                                                              │
│                  D1 Database                                 │
│                  (Metadata Only)                             │
│                  ├─ Ingestion Runs                           │
│                  ├─ Sync State                               │
│                  └─ Failed Messages                          │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Key Features

- **Unlimited Scale**: R2 storage grows with your data (no 10GB limit)
- **Cost Effective**: ~$20/month for 750GB ($0.015/GB/month)
- **Time Partitioned**: Data organized by `year/month/day` for efficient queries
- **Semi-Structured**: Typed fields + flexible JSON "data" field
- **Queue-Based**: Async processing with automatic retries
- **Multi-Protocol**: HTTP, Cron, and Queue triggers

## 📦 Workers

### Ingestion Workers (7 total)

| Worker | Purpose | Cron | Lines |
|--------|---------|------|-------|
| **npm-ingestion** | NPM package sync | 6 hours | 404 |
| **pypi-ingestion** | PyPI package sync | Daily | 434 |
| **email-pattern-worker** | Email discovery | On-demand | 463 |
| **github-ingestion** | GitHub data + emails | 4 hours | 739 |
| **czds-ingestion** | Zone files | Daily 2am | 638 |
| **whois-ingestion** | WHOIS lookups | Daily 3am | 635 |
| **theorg-scraper** | Org structure | Weekly Mon | 532 |
| **queue-processor-r2** | R2 batch writer | Queue | 559 |

**Total:** ~4,400 lines of production code

### Infrastructure

| Component | Purpose | Lines |
|-----------|---------|-------|
| **Dockerfile** | Container deployment | 87 |
| **docker-compose.yml** | Local dev environment | 70 |
| **proxy-rotation.ts** | Multi-provider proxy mgmt | 437 |
| **server.ts** | HTTP server for containers | 114 |

## 🚀 Quick Start

**15-minute setup:**

```bash
# 1. Clone and install
cd data-ingestion
pnpm install
wrangler login

# 2. Create infrastructure
wrangler d1 create data-ingestion
wrangler d1 execute data-ingestion --file=db/d1-minimal-schema.sql
wrangler r2 bucket create data-ingestion
wrangler kv:namespace create "DATA_CACHE"
wrangler queues create ingestion-queue

# 3. Update wrangler.toml files with IDs

# 4. Set secrets
wrangler secret put GITHUB_TOKEN

# 5. Deploy
wrangler deploy --config workers/queue-processor-r2.wrangler.toml
wrangler deploy --config workers/github-ingestion.wrangler.toml

# 6. Test
curl https://data-ingestion-github.YOUR_SUBDOMAIN.workers.dev/status
```

See [QUICKSTART.md](./QUICKSTART.md) for full guide.

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - 15-minute setup guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete production deployment (400+ lines)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and data flow (600+ lines)
- **[db/r2-schemas.md](./db/r2-schemas.md)** - Parquet schema definitions

## 💾 Data Storage

### R2 Bucket Structure

```
r2://data-ingestion/
├── npm/
│   └── year=2025/month=10/day=03/
│       ├── packages_00001.parquet
│       └── packages_00002.parquet
├── pypi/
│   └── year=2025/month=10/day=03/
├── github/
│   ├── profiles/year=2025/...
│   ├── repos/year=2025/...
│   └── commits/year=2025/...
├── emails/year=2025/...
├── orgs/year=2025/...
├── domains/year=2025/...
├── whois/year=2025/...
└── zones/
    ├── com/2025-10-03.zone
    ├── net/2025-10-03.zone
    └── org/2025-10-03.zone
```

### D1 Database (Minimal)

Only operational metadata:
- `ingestion_runs` - Track sync jobs
- `sync_state` - Last sync timestamps
- `failed_messages` - Error tracking

**Size:** <1GB (stays well under D1's 10GB limit)

## 🔍 Querying Data

### R2 SQL Queries

```sql
-- NPM packages by downloads
SELECT name, version, downloads_total
FROM read_parquet('r2://data-ingestion/npm/**/*.parquet')
WHERE downloads_total > 1000000
ORDER BY downloads_total DESC
LIMIT 100;

-- GitHub emails by domain
SELECT author_email, COUNT(*) as commit_count
FROM read_parquet('r2://data-ingestion/github/commits/**/*.parquet')
WHERE author_email LIKE '%@example.com'
GROUP BY author_email;

-- Email patterns with high confidence
SELECT domain, pattern, confidence
FROM read_parquet('r2://data-ingestion/emails/**/*.parquet')
WHERE confidence > 0.8;

-- Domains with DNSSEC
SELECT domain, tld, nameservers
FROM read_parquet('r2://data-ingestion/domains/**/*.parquet')
WHERE dnssec_enabled = true;
```

## 💰 Cost Breakdown

### Minimal Setup (~$7/month)

| Service | Usage | Cost |
|---------|-------|------|
| Workers Paid Plan | Base | $5.00 |
| R2 Storage | 50GB | $0.75 |
| Queues | 1M messages | $0.40 |
| D1 | <1GB | $0.00 |
| **Total** | | **$6.15** |

### Full Production (~$320/month)

| Service | Usage | Cost |
|---------|-------|------|
| Cloudflare Workers | Base | $5.00 |
| R2 Storage | 750GB | $11.25 |
| R2 Operations | 100M reads | $0.40 |
| Queues | 10M messages | $4.00 |
| Container (optional) | 1 instance | $10.00 |
| WhoisXML API | 10k queries | $50.00 |
| Hunter.io | Basic | $49.00 |
| Proxy Service | Residential | $200.00 |
| **Total** | | **$329.65** |

## 🛠️ Development

### Local Development

```bash
# Install dependencies
pnpm install

# Run type checking
pnpm typecheck

# Run tests
pnpm test

# Local development with Docker
docker-compose up

# Watch worker logs
wrangler tail data-ingestion-queue-processor
```

### Project Structure

```
data-ingestion/
├── db/
│   ├── d1-minimal-schema.sql       # D1 operational metadata
│   └── r2-schemas.md                # Parquet schemas
├── src/
│   ├── server.ts                    # HTTP server for containers
│   ├── proxy-rotation.ts            # Proxy management
│   └── proxy-usage-example.ts       # Usage patterns
├── workers/
│   ├── npm-ingestion.ts             # NPM worker
│   ├── pypi-ingestion.ts            # PyPI worker
│   ├── email-pattern-worker.ts      # Email worker
│   ├── github-ingestion.ts          # GitHub worker
│   ├── czds-ingestion.ts            # CZDS worker
│   ├── whois-ingestion.ts           # WHOIS worker
│   ├── theorg-scraper.ts            # TheOrg worker
│   └── queue-processor-r2.ts        # Queue consumer
├── Dockerfile                       # Container image
├── docker-compose.yml               # Local dev stack
├── requirements.txt                 # Python dependencies
├── wrangler.toml                    # Root config
└── workers/*.wrangler.toml          # Per-worker configs
```

## 🔐 Security

### Required Secrets

```bash
# GitHub API (required for GitHub worker)
wrangler secret put GITHUB_TOKEN

# CZDS (required for zone files)
wrangler secret put CZDS_USERNAME
wrangler secret put CZDS_PASSWORD

# Optional API keys
wrangler secret put WHOISXML_API_KEY
wrangler secret put HUNTER_API_KEY
wrangler secret put CLEARBIT_API_KEY

# Optional proxy credentials
wrangler secret put PROXY_USER
wrangler secret put PROXY_PASS
```

### Best Practices

- ✅ All credentials stored as Worker secrets
- ✅ Rate limiting per API provider
- ✅ Proxy rotation for scraping
- ✅ GDPR-compliant data handling
- ✅ Error tracking and alerting
- ✅ Cost monitoring and alerts

## 📊 Monitoring

### Health Checks

```bash
# Check worker status
curl https://data-ingestion-{worker}.{subdomain}.workers.dev/status

# View recent runs
wrangler d1 execute data-ingestion --command="
  SELECT * FROM ingestion_runs
  ORDER BY started_at DESC
  LIMIT 10;
"

# Check queue depth
wrangler queues list

# Monitor R2 storage
wrangler r2 object list data-ingestion | wc -l
```

### Metrics

- Ingestion runs (success/failure rates)
- Queue message counts
- R2 storage size and growth
- Worker execution time
- API rate limit usage

## 🐛 Troubleshooting

### Common Issues

**Workers not deploying?**
```bash
wrangler --version  # Must be latest
npm install -g wrangler@latest
```

**Queue backing up?**
- Increase `max_batch_size` in wrangler.toml
- Scale up queue consumer concurrency

**High R2 costs?**
- Implement data retention policies
- Delete old partitions: `r2 object delete --prefix=npm/year=2024/`

**Rate limited by APIs?**
- Enable proxy rotation
- Reduce cron frequency
- Add delays between requests

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting.

## 🔄 Data Pipeline

1. **Ingestion Workers** fetch data from source APIs
2. **Messages** queued to `ingestion-queue`
3. **Queue Processor** batches messages
4. **NDJSON** written to R2 (streaming-friendly format)
5. **Pipelines** convert NDJSON → Parquet (automatic)
6. **Data Catalog** indexes partitions
7. **R2 SQL** provides query interface

## 🎯 Use Cases

- **Package Intelligence** - Track NPM/PyPI ecosystem
- **Email Discovery** - Find contact patterns at scale
- **Domain Analytics** - DNS and WHOIS data analysis
- **Organization Mapping** - Company structure insights
- **Developer Intelligence** - GitHub activity analysis
- **Security Research** - Domain and DNSSEC monitoring

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please open issues or pull requests.

---

**Status:** Production Ready
**Setup Time:** 15 minutes
**Monthly Cost:** $7-$320 (depending on usage)
**Scale:** Unlimited (R2-first architecture)

Built with ❤️ using Cloudflare Workers, R2, D1, and Queues
