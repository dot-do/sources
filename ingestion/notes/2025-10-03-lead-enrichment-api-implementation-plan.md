# Lead Enrichment API - Implementation Plan

**Date:** 2025-10-03
**Phase:** 1 (MVP - Months 1-3)
**Timeline:** 2-3 weeks
**Priority:** Highest (23/25 score)

---

## Executive Summary

Build an MVP Lead Enrichment API that leverages our **existing GitHub and WHOIS data** to provide company and person enrichment at **$49-149/mo** (vs ZoomInfo $15k-100k/yr, Clearbit $99-999/mo).

**Key Advantages:**
- Uses data we already have (GitHub: 100M+ developers, WHOIS: unlimited domains)
- Zero additional data costs (FREE sources)
- Quick to market (2-3 weeks)
- Multi-source confidence scoring (higher accuracy than single-source competitors)

**Target Customers:**
- Indie hackers looking for developer contact data
- B2B SaaS companies selling to technical audiences
- Recruiters targeting developers/engineers
- Sales teams prospecting tech companies

---

## API Design

### Core Endpoints

#### 1. **Person Enrichment**
```
POST /v1/enrich/person
```

**Request:**
```json
{
  "email": "john@example.com",
  "domain": "example.com",
  "github_username": "johndoe",
  "linkedin_url": "https://linkedin.com/in/johndoe"
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
        "verified": true,
        "last_seen": "2025-10-01T10:30:00Z"
      },
      {
        "value": "johndoe@gmail.com",
        "type": "personal",
        "source": "github_profile",
        "confidence": 0.85,
        "verified": false,
        "last_seen": "2025-09-15T14:20:00Z"
      }
    ],
    "github": {
      "username": "johndoe",
      "url": "https://github.com/johndoe",
      "public_repos": 45,
      "followers": 230,
      "following": 120,
      "created_at": "2015-03-12T09:15:00Z",
      "updated_at": "2025-10-02T16:45:00Z",
      "bio": "Full-stack developer | Open source enthusiast",
      "location": "San Francisco, CA",
      "company": "Example Corp",
      "blog": "https://johndoe.dev",
      "languages": ["JavaScript", "Python", "Go"],
      "top_repos": [
        {
          "name": "awesome-project",
          "stars": 1200,
          "language": "JavaScript"
        }
      ]
    },
    "company": {
      "domain": "example.com",
      "name": "Example Corp",
      "confidence": 0.90
    },
    "social": {
      "twitter": "johndoe",
      "linkedin": "https://linkedin.com/in/johndoe"
    },
    "confidence_score": 0.92,
    "data_sources": ["github_profile", "github_commits", "github_repos"],
    "last_updated": "2025-10-03T21:15:00Z"
  }
}
```

#### 2. **Company Enrichment**
```
POST /v1/enrich/company
```

**Request:**
```json
{
  "domain": "example.com",
  "name": "Example Corp",
  "website": "https://example.com"
}
```

**Response:**
```json
{
  "company": {
    "name": "Example Corp",
    "legal_name": "Example Corporation Inc.",
    "domain": "example.com",
    "website": "https://example.com",
    "description": "Leading provider of enterprise software solutions",
    "industry": "Software",
    "employee_count": 250,
    "employee_count_range": "201-500",
    "founded_year": 2015,
    "location": {
      "city": "San Francisco",
      "state": "CA",
      "country": "US",
      "address": "123 Market St, San Francisco, CA 94105"
    },
    "contact": {
      "emails": [
        {
          "value": "contact@example.com",
          "type": "general",
          "source": "whois",
          "confidence": 0.85
        },
        {
          "value": "admin@example.com",
          "type": "admin",
          "source": "whois",
          "confidence": 0.90
        }
      ],
      "phone": "+1-415-555-0123"
    },
    "technology_stack": {
      "detected": false,
      "message": "Enable Technographics API for tech stack detection"
    },
    "github": {
      "organization": "example-corp",
      "url": "https://github.com/example-corp",
      "public_repos": 28,
      "members": 45,
      "top_repos": [
        {
          "name": "example-sdk",
          "stars": 2400,
          "language": "TypeScript",
          "description": "Official SDK for Example API"
        }
      ],
      "languages": ["TypeScript", "Python", "Go", "Rust"],
      "activity_level": "high",
      "last_commit": "2025-10-03T18:30:00Z"
    },
    "whois": {
      "registrar": "GoDaddy LLC",
      "registered_date": "2015-01-15T00:00:00Z",
      "expiration_date": "2026-01-15T00:00:00Z",
      "nameservers": ["ns1.example.com", "ns2.example.com"],
      "dnssec": true
    },
    "confidence_score": 0.88,
    "data_sources": ["whois", "github_org", "github_repos"],
    "last_updated": "2025-10-03T21:15:00Z"
  }
}
```

#### 3. **Bulk Enrichment**
```
POST /v1/enrich/bulk
```

**Request:**
```json
{
  "type": "person",
  "items": [
    {
      "email": "john@example.com",
      "domain": "example.com"
    },
    {
      "github_username": "janedoe"
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "input": {"email": "john@example.com", "domain": "example.com"},
      "person": { /* person enrichment data */ },
      "status": "success"
    },
    {
      "input": {"github_username": "janedoe"},
      "person": { /* person enrichment data */ },
      "status": "success"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "credits_used": 2
  }
}
```

#### 4. **Search by Domain**
```
GET /v1/search/people?domain=example.com&limit=50
```

**Response:**
```json
{
  "people": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "github_username": "johndoe",
      "confidence_score": 0.92
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "github_username": "janedoe",
      "confidence_score": 0.88
    }
  ],
  "total": 12,
  "page": 1,
  "per_page": 50,
  "has_more": false
}
```

#### 5. **Health & Status**
```
GET /v1/status
```

**Response:**
```json
{
  "status": "operational",
  "version": "1.0.0",
  "uptime": 99.98,
  "data_sources": {
    "github": {
      "status": "operational",
      "last_update": "2025-10-03T21:00:00Z",
      "records": 100234567
    },
    "whois": {
      "status": "operational",
      "last_update": "2025-10-03T20:45:00Z",
      "records": 5678901
    }
  },
  "rate_limits": {
    "requests_per_minute": 60,
    "requests_per_day": 10000
  }
}
```

---

## Data Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Lead Enrichment API Request                   │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│              Cloudflare Worker (API Gateway)                     │
│  - Authentication (API key)                                      │
│  - Rate limiting (Redis/KV)                                      │
│  - Request validation                                            │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│              Enrichment Engine (Durable Object)                  │
│  - Query existing data (R2 + D1)                                 │
│  - Multi-source aggregation                                      │
│  - Confidence scoring                                            │
│  - Deduplication                                                 │
└─────────────────────────────────────────────────────────────────┘
                    ↓           ↓           ↓
        ┌───────────────┐  ┌───────────┐  ┌──────────┐
        │   GitHub Data  │  │ WHOIS Data│  │ D1 Cache │
        │   (R2 Parquet) │  │(R2 Parquet)│  │(Metadata)│
        └───────────────┘  └───────────┘  └──────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Response with Enriched Data                   │
│  - Confidence scores                                             │
│  - Data sources                                                  │
│  - Last updated timestamps                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Data Sources Integration

#### GitHub Data (Already Ingested)
**Location:** `r2://data-ingestion/github/**/*.parquet`

**Available Data:**
- Profiles: username, name, email, bio, location, company, blog, avatar
- Repositories: repo names, languages, stars, forks, descriptions
- Commits: author emails, committer emails, commit messages, dates

**Query Strategy:**
```sql
-- Find person by email
SELECT * FROM read_parquet('r2://data-ingestion/github/commits/**/*.parquet')
WHERE author_email = 'john@example.com'
ORDER BY committed_at DESC
LIMIT 100;

-- Find people at company
SELECT DISTINCT author_email, author_name
FROM read_parquet('r2://data-ingestion/github/commits/**/*.parquet')
WHERE author_email LIKE '%@example.com'
GROUP BY author_email, author_name;

-- Find GitHub profile
SELECT * FROM read_parquet('r2://data-ingestion/github/profiles/**/*.parquet')
WHERE login = 'johndoe';
```

#### WHOIS Data (Already Ingested)
**Location:** `r2://data-ingestion/whois/**/*.parquet`

**Available Data:**
- Domain registration: registrant name, email, organization
- Technical contacts: email, name, phone
- Administrative contacts: email, name, phone
- Nameservers, registrar, dates

**Query Strategy:**
```sql
-- Find domain WHOIS
SELECT * FROM read_parquet('r2://data-ingestion/whois/**/*.parquet')
WHERE domain = 'example.com'
ORDER BY updated_at DESC
LIMIT 1;

-- Find all domains registered to email
SELECT domain, registrant_email, registrant_name
FROM read_parquet('r2://data-ingestion/whois/**/*.parquet')
WHERE registrant_email = 'admin@example.com';
```

### Caching Strategy

**D1 Cache (Fast Lookups):**
```sql
CREATE TABLE enrichment_cache (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'person' or 'company'
  input_key TEXT NOT NULL, -- email, domain, github_username
  enriched_data TEXT NOT NULL, -- JSON blob
  confidence_score REAL,
  data_sources TEXT, -- JSON array of sources
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL, -- TTL: 7 days
  credits_used INTEGER DEFAULT 1
);

CREATE INDEX idx_enrichment_cache_input ON enrichment_cache(input_key);
CREATE INDEX idx_enrichment_cache_type ON enrichment_cache(type);
CREATE INDEX idx_enrichment_cache_expires ON enrichment_cache(expires_at);
```

**Cache Strategy:**
- Cache hits: Instant response (<50ms)
- Cache misses: Query R2, aggregate, score, cache result (200-500ms)
- TTL: 7 days (fresh data)
- Invalidation: On data updates

---

## Confidence Scoring Algorithm

### Multi-Source Scoring

**Base Confidence:**
- 1 source = 0.70 confidence
- 2 sources = 0.85 confidence (0.70 + 0.15)
- 3+ sources = 0.95 confidence (0.70 + 0.15 + 0.10)

**Source Weights:**
- GitHub profile: 1.0 (most reliable)
- GitHub commits: 0.9 (very reliable)
- WHOIS registrant: 0.8 (can be outdated)
- WHOIS technical contact: 0.7 (often proxy)

**Freshness Decay:**
- 0-30 days: 1.0 multiplier (no decay)
- 31-90 days: 0.95 multiplier
- 91-180 days: 0.90 multiplier
- 181-365 days: 0.80 multiplier
- 365+ days: 0.70 multiplier

**Verification Boost:**
- Email verified via SMTP: +0.10 confidence
- GitHub activity in last 30 days: +0.05 confidence
- Multiple commit signatures: +0.05 confidence

**Final Confidence Score:**
```
confidence = min(1.0, base_confidence × source_weight_avg × freshness_multiplier + verification_boosts)
```

**Example Calculation:**
```javascript
// Person found in 2 sources
const sources = [
  { type: 'github_profile', weight: 1.0, age_days: 15 },
  { type: 'github_commits', weight: 0.9, age_days: 2 }
];

// Base confidence for 2 sources
const baseConfidence = 0.85;

// Average source weight
const avgWeight = (1.0 + 0.9) / 2 = 0.95;

// Freshness (both recent, no decay)
const freshnessMultiplier = 1.0;

// Verification boosts
const emailVerified = true; // +0.10
const recentActivity = true; // +0.05

// Final score
const confidence = Math.min(1.0, 0.85 × 0.95 × 1.0 + 0.10 + 0.05);
// = Math.min(1.0, 0.8075 + 0.15)
// = 0.9575 ≈ 0.96
```

---

## Authentication & Rate Limiting

### API Key Authentication

**Header:**
```
Authorization: Bearer api_live_abc123xyz789...
```

**Key Format:**
- Prefix: `api_live_` (production) or `api_test_` (sandbox)
- Random: 32 characters (alphanumeric)
- Example: `api_live_7k2m9n4p6q8r1s3t5u7v9w0x2y4z`

**Storage:**
- D1 table: `api_keys`
- Hash: SHA-256 (store hash, not plaintext)
- Metadata: user_id, tier, rate_limit, created_at, last_used

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- api_live_ or api_test_
  tier TEXT NOT NULL, -- free, starter, growth, pro
  rate_limit_rpm INTEGER DEFAULT 60,
  rate_limit_rpd INTEGER DEFAULT 10000,
  credits_limit INTEGER DEFAULT 1000,
  credits_used INTEGER DEFAULT 0,
  credits_reset_at TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  expires_at TEXT,
  revoked BOOLEAN DEFAULT 0
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
```

### Rate Limiting

**Tiers:**
| Tier | Requests/Min | Requests/Day | Credits/Month | Price |
|------|--------------|--------------|---------------|-------|
| Free | 10 | 100 | 100 | $0 |
| Starter | 60 | 10,000 | 1,000 | $49 |
| Growth | 300 | 50,000 | 5,000 | $149 |
| Pro | 600 | 100,000 | 10,000 | $399 |

**Implementation:**
- Storage: Cloudflare KV (fast, distributed)
- Algorithm: Token bucket (smooth rate limiting)
- Key: `ratelimit:{api_key_hash}:{minute}` and `ratelimit:{api_key_hash}:{day}`

**Response Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1696377600
X-Credits-Limit: 1000
X-Credits-Used: 125
X-Credits-Remaining: 875
X-Credits-Reset: 1698969600
```

**Rate Limit Exceeded:**
```json
{
  "error": {
    "type": "rate_limit_exceeded",
    "message": "Rate limit exceeded. You have made 61 requests in the last minute. Your limit is 60 requests per minute.",
    "retry_after": 30
  }
}
```

---

## Pricing & Credits

### Credit System

**Credits per API Call:**
- Person enrichment: 1 credit
- Company enrichment: 1 credit
- Bulk enrichment: 1 credit per item
- Search by domain: 1 credit per 50 results

**Credit Refunds:**
- No data found: Full refund (0 credits)
- Low confidence (<0.50): 50% refund (0.5 credits)
- Cached result: No charge (0 credits if <1 hour old)

### Pricing Tiers

**Free Tier:**
- 100 credits/month
- 10 requests/minute
- 100 requests/day
- API access
- Community support
- 7-day data freshness

**Starter - $49/month:**
- 1,000 credits/month
- 60 requests/minute
- 10,000 requests/day
- API access
- Email support
- 7-day data freshness
- **Most Popular**

**Growth - $149/month:**
- 5,000 credits/month
- 300 requests/minute
- 50,000 requests/day
- API access
- Priority support
- Real-time data freshness
- Webhooks

**Pro - $399/month:**
- 10,000 credits/month
- 600 requests/minute
- 100,000 requests/day
- API access
- Priority support
- Real-time data freshness
- Webhooks
- Custom integrations

---

## Technical Implementation

### Tech Stack

**API Layer:**
- Cloudflare Workers (edge compute)
- Hono.js (web framework)
- TypeScript (type safety)

**Data Layer:**
- R2 (Parquet data storage)
- D1 (SQLite cache + metadata)
- KV (rate limiting, session storage)

**Data Processing:**
- Durable Objects (stateful enrichment engine)
- Queues (async enrichment jobs)

**Observability:**
- Analytics Engine (usage metrics)
- Logpush (error tracking)
- Custom dashboards (Grafana/Metabase)

### Code Structure

```
workers/lead-enrichment/
├── src/
│   ├── index.ts                    # Main worker entry point
│   ├── routes/
│   │   ├── enrich-person.ts        # POST /v1/enrich/person
│   │   ├── enrich-company.ts       # POST /v1/enrich/company
│   │   ├── enrich-bulk.ts          # POST /v1/enrich/bulk
│   │   ├── search-people.ts        # GET /v1/search/people
│   │   └── status.ts               # GET /v1/status
│   ├── enrichment/
│   │   ├── engine.ts               # Enrichment Durable Object
│   │   ├── github-source.ts        # GitHub data queries
│   │   ├── whois-source.ts         # WHOIS data queries
│   │   ├── aggregator.ts           # Multi-source aggregation
│   │   └── confidence.ts           # Confidence scoring algorithm
│   ├── middleware/
│   │   ├── auth.ts                 # API key authentication
│   │   ├── rate-limit.ts           # Rate limiting (KV)
│   │   ├── cors.ts                 # CORS headers
│   │   └── error-handler.ts        # Global error handling
│   ├── lib/
│   │   ├── cache.ts                # D1 caching layer
│   │   ├── r2-query.ts             # R2 Parquet queries
│   │   ├── validation.ts           # Zod schemas
│   │   └── utils.ts                # Helpers
│   └── types.ts                    # TypeScript types
├── tests/
│   ├── integration/                # Integration tests
│   ├── unit/                       # Unit tests
│   └── fixtures/                   # Test data
├── wrangler.jsonc                  # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── README.md
```

### Key Dependencies

```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "zod": "^3.22.0",
    "@cloudflare/workers-types": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "wrangler": "^3.0.0"
  }
}
```

---

## Development Workflow

### Phase 1: Foundation (Week 1)

**Days 1-2: Setup & Architecture**
- [ ] Initialize Cloudflare Worker project
- [ ] Set up TypeScript + Hono.js
- [ ] Configure wrangler.jsonc (bindings: R2, D1, KV, Durable Objects)
- [ ] Define TypeScript types and Zod schemas
- [ ] Create D1 schema (cache, api_keys, usage_logs)

**Days 3-4: Data Integration**
- [ ] Build R2 query layer (Parquet reader)
- [ ] Implement GitHub data source (profiles, repos, commits)
- [ ] Implement WHOIS data source (domain lookups)
- [ ] Build caching layer (D1)
- [ ] Test data retrieval (unit tests)

**Days 5-7: Enrichment Engine**
- [ ] Implement Durable Object (EnrichmentEngine)
- [ ] Build multi-source aggregator
- [ ] Implement confidence scoring algorithm
- [ ] Add deduplication logic
- [ ] Write unit tests (85%+ coverage)

### Phase 2: API Development (Week 2)

**Days 8-9: Core Endpoints**
- [ ] POST /v1/enrich/person (person enrichment)
- [ ] POST /v1/enrich/company (company enrichment)
- [ ] POST /v1/enrich/bulk (bulk enrichment)
- [ ] GET /v1/search/people?domain= (search by domain)
- [ ] GET /v1/status (health check)

**Days 10-11: Authentication & Rate Limiting**
- [ ] API key generation (CLI tool)
- [ ] Authentication middleware (Bearer token)
- [ ] Rate limiting middleware (KV token bucket)
- [ ] Credit tracking (D1 counters)
- [ ] Error responses (standardized format)

**Days 12-13: Testing & Polish**
- [ ] Integration tests (all endpoints)
- [ ] Load testing (Cloudflare Load Balancer)
- [ ] Error handling (edge cases)
- [ ] Response formatting (consistent structure)
- [ ] CORS configuration

**Day 14: Documentation**
- [ ] OpenAPI/Swagger spec
- [ ] README with examples
- [ ] Postman collection
- [ ] API reference docs

### Phase 3: Deployment (Week 3)

**Days 15-16: Production Setup**
- [ ] Deploy to Cloudflare Workers
- [ ] Configure custom domain (api.leadenrich.do)
- [ ] Set up SSL certificates
- [ ] Configure monitoring (Analytics Engine)
- [ ] Set up error tracking (Sentry/Logpush)

**Days 17-18: Beta Testing**
- [ ] Invite 10-20 beta users
- [ ] Collect feedback
- [ ] Fix bugs and edge cases
- [ ] Performance optimization
- [ ] Documentation improvements

**Days 19-21: Launch Preparation**
- [ ] Create landing page (leadenrich.do)
- [ ] Write blog post (launch announcement)
- [ ] Prepare Product Hunt launch
- [ ] Set up support (email, Discord)
- [ ] Monitor usage and errors

---

## Success Metrics (Week 1-3)

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Uptime** | 99.5%+ | Cloudflare analytics |
| **Response Time (p50)** | <100ms | Cloudflare analytics |
| **Response Time (p95)** | <500ms | Cloudflare analytics |
| **Cache Hit Rate** | 60%+ | D1 queries vs R2 queries |
| **Error Rate** | <1% | Error logs |
| **Data Accuracy** | 85%+ | Manual validation (100 samples) |

### Business Metrics

| Metric | Week 1 | Week 2 | Week 3 | Measurement |
|--------|--------|--------|--------|-------------|
| **Beta Signups** | 10 | 25 | 50 | Landing page |
| **API Keys Generated** | 10 | 30 | 60 | D1 api_keys table |
| **Total API Calls** | 100 | 500 | 2,000 | Analytics Engine |
| **Unique Users** | 10 | 25 | 50 | Distinct API keys |
| **Avg Calls/User** | 10 | 20 | 40 | Total calls / users |
| **Free → Paid Conv.** | 0% | 5% | 10% | Paid subscriptions |

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **R2 query performance** | High | Implement aggressive caching, optimize Parquet queries, pre-aggregate common lookups |
| **Rate limit bypass** | Medium | Use cryptographic hashing, distribute counters, monitor abuse patterns |
| **Data staleness** | Medium | Set TTL (7 days), provide "last_updated" timestamp, batch refresh popular lookups |
| **API key leaks** | High | Provide key rotation, monitor unusual usage patterns, implement key scoping |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Low accuracy** | High | Multi-source verification, confidence scoring, user feedback loop |
| **Poor adoption** | High | Free tier (100 credits), great docs, responsive support, build in public |
| **Competitor response** | Medium | They can't match our prices (AWS costs), keep iterating fast |
| **Legal challenges** | Low | hiQ precedent protects us, focus on company data, provide opt-out |

---

## Next Steps After MVP

### Phase 1.5: Enhancements (Weeks 4-6)

**Additional Data Sources:**
- [ ] Company website scraping (About, Team pages)
- [ ] Job posting integration (hiring signals)
- [ ] LinkedIn public profiles (if legal)
- [ ] Social media (Twitter, personal blogs)

**Advanced Features:**
- [ ] Bulk CSV upload/download
- [ ] Webhooks (enrichment complete)
- [ ] Team features (shared credits)
- [ ] Usage analytics dashboard

**Integrations:**
- [ ] Zapier integration
- [ ] HubSpot integration
- [ ] Salesforce integration
- [ ] Google Sheets add-on

### Phase 2: Scale (Months 4-6)

**Infrastructure:**
- [ ] Scale to 1M+ API calls/day
- [ ] Multi-region deployment
- [ ] Advanced caching (Redis)
- [ ] Real-time data updates

**Business:**
- [ ] Onboard 500+ customers
- [ ] Reach $50K MRR
- [ ] Launch growth/pro tiers
- [ ] Build sales funnel

---

## Budget & Resources

### Infrastructure Costs (Months 1-3)

| Resource | Estimated Usage | Cost/Month |
|----------|-----------------|------------|
| Cloudflare Workers | 1M requests | $5 (base) + $0.30 |
| R2 Storage | 50GB | $0.75 |
| D1 Database | <1GB | $0 (free tier) |
| KV | 10M reads | $0.50 |
| Durable Objects | 1K hours | $0.15 |
| Custom Domain | api.leadenrich.do | $10 |
| **Total** | | **~$17/month** |

### Team

**MVP (Solo Developer):**
- 1 Full-stack engineer (you or contractor)
- Time: 2-3 weeks full-time
- Cost: $0 (if you) or $5K-10K (contractor)

**Post-MVP (Optional):**
- 1 Frontend developer (landing page, dashboard)
- 1 DevOps engineer (monitoring, scaling)
- 1 Support person (part-time, customer success)

---

## Conclusion

This implementation plan provides a **clear path to launching an MVP Lead Enrichment API in 2-3 weeks** using data we already have (GitHub + WHOIS).

**Key Success Factors:**
1. **Use existing data** - No new data acquisition costs
2. **Simple architecture** - Cloudflare Workers + R2 + D1 (proven stack)
3. **Quick to market** - 2-3 weeks is achievable
4. **Clear value prop** - $49-149/mo vs $15k-100k/yr (ZoomInfo)
5. **Free tier** - Attract developers, validate demand

**Expected Outcomes (Week 3):**
- 50+ beta users
- 2,000+ API calls
- 5-10% free → paid conversion
- $245-490 MRR (5-10 paying customers × $49/mo)
- Validation of product-market fit

**Next Decision Point (Week 3):**
- If traction is good: Proceed to Phase 1.5 (add more data sources)
- If traction is poor: Pivot to different API category or adjust pricing/positioning

Let's build! 🚀

---

**Document Version:** 1.0
**Created:** 2025-10-03
**Status:** Ready for Implementation
**Owner:** Data Ingestion Team
