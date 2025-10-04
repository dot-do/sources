# Buyer Intent Signals & Data Sources Research
**Date:** 2025-10-03
**Purpose:** Research intent data and buyer signal sources to build a competitive alternative to Bombora, 6sense, and G2 Buyer Intent

---

## Executive Summary

The B2B intent data market is dominated by enterprise-level providers (Bombora, 6sense, G2) with pricing ranging from $20,000-$200,000+ annually. These platforms aggregate buyer signals from multiple sources to identify companies actively researching solutions, but face accuracy challenges, high costs, and limited SMB accessibility.

**Our Opportunity:** Build an API-first, cost-effective intent data platform by:
1. Aggregating 15+ free/low-cost signal sources (job postings, GitHub, SEC filings, DNS/SSL changes)
2. Offering real-time signals vs. competitors' batch processing (daily/weekly)
3. Providing transparent pricing ($99-999/month vs. $20k-200k/year enterprise)
4. Focusing on public company signals (GDPR-compliant, no personal tracking)
5. API-first architecture vs. competitors' platform-first approach

**Target Cost:** $0.01-0.05 per intent signal vs. competitors' $0.10-0.50+ per signal, enabling 80-95% cost reduction while maintaining signal quality through multi-source validation.

---

## Competitive Landscape Analysis

### Enterprise Incumbent Pricing

| Provider | Annual Cost | Pricing Model | Target Market |
|----------|-------------|---------------|---------------|
| **Bombora** | $20,000-$100,000+ | CPM ($1.50-$3.00 per thousand impressions) | Enterprise |
| **6sense** | $55,000-$130,000+ (median: $55k) | Custom quotes, credit-based | Enterprise |
| **G2 Buyer Intent** | $36,000-$50,000 (add-on to $15k base) | Bundled with G2 Core subscription | Mid-Market to Enterprise |
| **ZoomInfo** | $25,000-$100,000+ | Credit-based, 10+ requests/second | Enterprise |
| **Lead411** | $1,000-$10,000/month | Flat rate, growth intent included | SMB to Mid-Market |

### Key Competitive Weaknesses

**Bombora:**
- Co-op model requires publisher partnerships (data latency)
- CPM pricing penalizes high-volume users
- Limited to content consumption signals
- False positive concerns with IP-based tracking

**6sense:**
- Extremely high cost ($60k-130k/year)
- Opaque pricing, requires sales engagement
- Credit systems don't roll over (use-it-or-lose-it)
- Complex setup and onboarding

**G2 Buyer Intent:**
- Limited to G2 ecosystem activity (review sites only)
- Requires base $15k Core subscription + $36-50k add-on
- 480% price increase for full features
- Narrow signal coverage

**ZoomInfo:**
- Accuracy issues with IP-based tracking and bidstream data
- High false positive rates reported by users
- Complex credit system with hidden fees
- Starting at $25k but easily exceeds $100k

### Our Competitive Advantages

1. **Pricing:** 80-95% cost reduction ($99-999/mo vs. $20k-200k/yr)
2. **Signal Diversity:** 15+ signal types vs. competitors' 3-5 core sources
3. **Real-Time:** Hourly/daily updates vs. weekly batches
4. **API-First:** Developer-friendly vs. platform-first UX
5. **Transparency:** Clear pricing, no hidden credits or add-ons
6. **SMB-Friendly:** Accessible to startups and small teams
7. **Multi-Source Validation:** Combine signals for higher confidence scores
8. **Privacy-First:** Public company signals only, no personal tracking

---

## Intent Signal Data Sources (15+ Types)

### 1. Job Posting Signals (HIGH VALUE - Confidence: 8/10)

**Why It Matters:** Job postings reveal hiring expansion, technology adoption, team growth, and budget authority.

**Signal Types:**
- Hiring for specific roles (DevOps Engineer = cloud migration)
- Technology stack requirements (Python, React, AWS)
- Seniority level changes (VP Engineering = growth phase)
- New office locations (geographic expansion)
- Headcount increases (funding/revenue growth)
- Job title inflation (promotions = budget authority)

**Data Sources:**
| Source | Cost | Coverage | Freshness | API Access |
|--------|------|----------|-----------|------------|
| **JobSpy** | FREE | Good | Daily | Yes (Python library) |
| **Adzuna API** | FREE-$99/mo | Global, 9 countries | Real-time | Yes (REST) |
| **Indeed** | Free posts, PPC for sponsored | Extensive | Daily | Limited (deprecated API) |
| **LinkedIn Jobs** | N/A (scraping) | Premium | Hourly | No official API |
| **Coresignal Job Postings** | Custom pricing | Multi-source aggregation | Daily | Yes (REST) |

**Implementation:**
- Daily scraping of target companies' career pages
- Change detection: new roles, removed roles, updated descriptions
- NLP extraction: tech stack, tools, skills, seniority levels
- Scoring: Volume of new jobs, speed of hiring, role types

**Example Signals:**
- Company posts 5+ DevOps/SRE roles = Cloud infrastructure investment
- "Salesforce Administrator" job = CRM implementation or migration
- "Data Engineer - Snowflake" = Data warehouse adoption
- VP of Sales hiring = Revenue acceleration phase

---

### 2. GitHub Activity Signals (HIGH VALUE - Confidence: 9/10)

**Why It Matters:** GitHub reveals technology adoption, open-source involvement, and engineering activity.

**Signal Types:**
- Repository creation (new project launches)
- Stars/forks on specific tools (technology evaluation)
- Commits to open-source projects (technology adoption)
- New contributors from company domains (team expansion)
- Repository visibility changes (private → public = launch signal)
- Technology stack analysis (languages, frameworks, dependencies)

**Data Sources:**
| Source | Cost | Coverage | Rate Limits | API Access |
|--------|------|----------|-------------|------------|
| **GitHub REST API** | FREE | Complete public repos | 5,000 req/hr (authenticated) | Yes (REST) |
| **GitHub GraphQL API** | FREE | Complete public repos | 5,000 points/hr | Yes (GraphQL) |
| **GitHub Archive** | FREE | Historical event data | N/A (BigQuery) | Yes (BigQuery) |

**Implementation:**
- Monitor company GitHub organizations
- Track employee contributions (via company email domains)
- Detect new repositories and technology adoption
- Analyze commit frequency and contributor growth
- Identify dependencies (package.json, requirements.txt, go.mod)

**Example Signals:**
- Company stars "Terraform" repos = Infrastructure as Code adoption
- New repository "mobile-app-ios" = Mobile development initiative
- Contributions to Kubernetes = Container orchestration migration
- Package.json shows "React 19" = Frontend modernization

**Rate Limits:**
- Unauthenticated: 60 requests/hour
- Authenticated: 5,000 requests/hour
- GitHub Apps: 15,000 requests/hour (Enterprise Cloud orgs)

---

### 3. Funding & Financial Signals (HIGH VALUE - Confidence: 9/10)

**Why It Matters:** Funding events indicate budget availability, growth plans, and buying readiness.

**Signal Types:**
- Series A/B/C funding rounds
- SEC Form D filings (exempt securities offerings)
- Revenue growth (SEC 10-K/10-Q filings for public companies)
- Acquisitions and mergers
- IPO preparations (S-1 filings)
- Debt financing (expansion capital)

**Data Sources:**
| Source | Cost | Coverage | Freshness | API Access |
|--------|------|----------|-----------|------------|
| **SEC EDGAR API** | FREE | US public companies | Real-time | Yes (REST, JSON) |
| **Crunchbase API** | $0.03-0.16/request | Global startups/private companies | Daily | Yes (REST) |
| **PitchBook** | Enterprise pricing | Private market data | Daily | Yes (API available) |
| **AngelList** | N/A (scraping) | Startups | Weekly | No public API |

**Implementation:**
- Monitor SEC EDGAR RSS feeds for Form D, S-1, 10-K, 10-Q filings
- Crunchbase API for private company funding announcements
- Natural language processing on press releases
- Cross-reference with company LinkedIn follower growth

**Example Signals:**
- Series B funding ($20M+) = 6-12 month buying window
- SEC Form D filing = Private funding round (immediate buying intent)
- 10-K shows 30% YoY revenue growth = Expansion mode
- Acquisition announcement = Integration/consolidation needs

**SEC EDGAR API Details:**
- Free, unlimited access to all public filings
- Rate limit: 10 requests/second
- JSON format via data.sec.gov
- Real-time RSS feeds for new filings

---

### 4. Technology Adoption Signals (HIGH VALUE - Confidence: 8/10)

**Why It Matters:** Technographic changes reveal infrastructure upgrades, tool evaluations, and stack modernization.

**Signal Types:**
- New technology installations (detected via HTML/JavaScript)
- Stack changes (CRM, analytics, CDN, hosting)
- API usage patterns (increased traffic to specific APIs)
- Open-source package adoption (npm, PyPI, Maven)
- Conference sponsorships (technology evangelism)

**Data Sources:**
| Source | Cost | Coverage | Freshness | API Access |
|--------|------|----------|-----------|------------|
| **Wappalyzer API** | $50-500/mo | 2,000+ technologies, 80M+ websites | Weekly | Yes (REST) |
| **TheirStack API** | Custom pricing | 32,000+ technologies | Daily | Yes (REST) |
| **BuiltWith** | $295-995/mo | 90,000+ technologies | Monthly | Yes (REST) |
| **Coresignal Technographics** | Custom pricing | Multi-source aggregation | Daily | Yes (REST) |

**Implementation:**
- HTML/JavaScript analysis of company websites
- DNS record monitoring (new subdomains, third-party services)
- Job posting tech stack extraction (cross-validation)
- GitHub repository dependency analysis

**Example Signals:**
- Wappalyzer detects "Stripe" added = Payment processing setup
- New subdomain "api.company.com" = API launch imminent
- Job posting + GitHub repo + Wappalyzer = High-confidence adoption
- Stack change from "Heroku" to "AWS" = Cloud infrastructure migration

---

### 5. Domain & Infrastructure Signals (MEDIUM VALUE - Confidence: 7/10)

**Why It Matters:** Infrastructure changes indicate launches, migrations, expansions, and technical modernization.

**Signal Types:**
- New domain registrations (product launches, rebrands)
- SSL certificate issuance (new services, security upgrades)
- DNS record changes (migrations, service additions)
- Subdomain additions (new products, regional expansions)
- CDN adoption (performance optimization, global expansion)
- Hosting provider changes (cloud migrations)

**Data Sources:**
| Source | Cost | Coverage | Freshness | API Access |
|--------|------|----------|-----------|------------|
| **Certificate Transparency Logs (crt.sh)** | FREE | All SSL certificates globally | Real-time | Yes (REST, PostgreSQL) |
| **SecurityTrails API** | $50-500/mo | DNS history, WHOIS, subdomains | Daily | Yes (REST) |
| **DNSMonitor** | $99-299/mo | DNS change detection | Hourly | Yes (webhooks) |
| **DNS Spy** | $9-99/mo | Real-time DNS monitoring | Real-time | Yes (REST) |
| **WHOIS APIs** | $10-100/mo | Domain registration data | Daily | Yes (REST) |

**Implementation:**
- Monitor Certificate Transparency logs for new SSL certificates
- Track DNS changes via passive DNS databases
- Detect new subdomains (api.*, blog.*, shop.*, mobile.*)
- WHOIS monitoring for domain registrations/transfers
- IP address changes (hosting migrations)

**Example Signals:**
- New SSL cert for "shop.company.com" = E-commerce launch
- DNS change from "Cloudflare" to "Fastly" = CDN migration
- Multiple subdomain registrations = Product suite expansion
- New domain "company-io.com" = Rebrand or new product line

**Certificate Transparency Details:**
- 100% free access to all SSL certificate logs
- Real-time updates (certificates logged within minutes)
- Query via crt.sh (web + PostgreSQL API)
- Monitors 40+ CT log servers globally

---

### 6. Content Consumption Signals (MEDIUM VALUE - Confidence: 6/10)

**Why It Matters:** Content engagement reveals research activity, problem awareness, and solution evaluation.

**Signal Types:**
- Pricing page visits (strong buying intent)
- Documentation browsing (technical evaluation)
- Case study downloads (industry-specific interest)
- Blog post engagement (problem awareness)
- Webinar registrations (active learning)
- Whitepaper downloads (deep research)

**Data Sources:**
| Source | Cost | Coverage | Freshness | Data Type |
|--------|------|----------|-----------|-----------|
| **First-Party Analytics** | FREE (self-tracked) | Your website only | Real-time | Page views, time on page |
| **Bombora (Third-Party)** | $1,000-10,000/mo | 5,000+ B2B publisher network | Weekly batches | Aggregate topic surges |
| **G2 Buyer Intent** | $36,000-50,000/yr | G2 ecosystem only | Daily | Review page views, comparisons |
| **IP Intelligence (Clearbit, 6sense)** | $5,000-50,000/yr | Reverse IP lookup | Real-time | Anonymous visitor identification |

**Implementation:**
- First-party: Google Analytics, Cloudflare Analytics, custom tracking
- Third-party: Bombora co-op, G2 integration, IP intelligence APIs
- Scoring: High intent = pricing + demo requests, Low intent = blog reading

**Challenges:**
- Privacy regulations (GDPR, CCPA) limit personal tracking
- Cookie deprecation reduces third-party tracking accuracy
- IP-based attribution has high false positive rates
- Content signals alone are weak without firmographic validation

**Our Approach:**
- Focus on first-party signals (companies visiting YOUR website)
- Validate with external signals (job postings, funding, GitHub activity)
- Avoid third-party cookie tracking (privacy-first)

---

### 7. Firmographic Change Signals (HIGH VALUE - Confidence: 8/10)

**Why It Matters:** Company changes indicate transformation, growth, and increased budgets.

**Signal Types:**
- Revenue growth (public company earnings)
- Employee count increases (hiring velocity)
- New office locations (geographic expansion)
- Executive changes (new leadership = new priorities)
- Mergers & acquisitions (integration needs)
- Partnership announcements (ecosystem expansion)
- Customer wins (growth momentum)

**Data Sources:**
| Source | Cost | Coverage | Freshness | API Access |
|--------|------|----------|-----------|------------|
| **LinkedIn Company Pages** | N/A (scraping) | Follower count, employee count | Daily | No official API |
| **Crunchbase API** | $0.03-0.16/request | Private + public companies | Daily | Yes (REST) |
| **SEC EDGAR (Public Companies)** | FREE | US public companies | Real-time | Yes (REST) |
| **Google Maps API** | $0.005-0.02/request | Office locations | Real-time | Yes (REST) |
| **Press Release Aggregators** | FREE-$500/mo | PR Newswire, Business Wire | Real-time | RSS/API |

**Implementation:**
- Track LinkedIn employee count changes (follower growth proxy)
- Monitor press releases for announcements
- SEC filings for public companies (10-K, 8-K forms)
- Job postings with location = new office signals
- Crunchbase for acquisitions, partnerships, leadership changes

**Example Signals:**
- Employee count +20% in 6 months = Rapid growth phase
- New office in Austin = Regional expansion
- CEO change announcement = Strategic shift likely
- Acquisition of competitor = Integration/consolidation needs
- Partnership with AWS = Cloud-first strategy

---

### 8. Social Media Signals (LOW-MEDIUM VALUE - Confidence: 5/10)

**Why It Matters:** Social conversations reveal pain points, product evaluations, and competitive intelligence.

**Signal Types:**
- Problem-solving discussions (Twitter, Reddit)
- Product mentions and reviews
- Competitor comparisons
- Technology discussions
- Sentiment analysis (frustration = buyer intent)
- Influencer engagement

**Data Sources:**
| Source | Cost | Coverage | Rate Limits | API Access |
|--------|------|----------|-------------|------------|
| **Twitter (X) API** | $100-42,000/mo (v2 tiers) | Public tweets | Varies by tier | Yes (REST) |
| **Reddit API** | FREE | All public subreddits | 60 requests/min | Yes (REST) |
| **LinkedIn API** | N/A | Limited access | N/A | No public API |
| **Brandwatch** | $10,000+/year | Twitter firehose, Reddit firehose | Unlimited | Yes (enterprise) |
| **Hootsuite** | $99-739/mo | Multi-platform | Varies | Limited |

**Implementation:**
- Reddit monitoring for problem-solving threads (r/devops, r/startups)
- Twitter keyword tracking ("looking for CRM", "need to migrate")
- Sentiment analysis on product mentions
- Influencer engagement tracking

**Challenges:**
- High noise-to-signal ratio
- Twitter API now expensive ($100-42,000/month)
- LinkedIn has no public API for social listening
- Reddit API is free but rate-limited (60 req/min)

**Our Approach:**
- Focus on Reddit (free, high-quality B2B discussions)
- Use Twitter selectively for high-value keywords
- Avoid LinkedIn social listening (no API access)

---

### 9. Review Site Activity (MEDIUM VALUE - Confidence: 7/10)

**Why It Matters:** Review activity reveals solution evaluation, competitive comparisons, and buying readiness.

**Signal Types:**
- Product reviews posted (recent evaluation)
- Comparison page views (G2 "alternatives" traffic)
- Category research (browsing specific software categories)
- Negative reviews (churn risk = replacement opportunity)
- Feature-specific searches (detailed evaluation stage)

**Data Sources:**
| Source | Cost | Coverage | Freshness | API Access |
|--------|------|----------|-----------|------------|
| **G2 Buyer Intent** | $36,000-50,000/yr | G2 ecosystem only | Daily | Yes (via integration) |
| **Capterra** | N/A | 2M+ reviews | N/A | No public API |
| **TrustRadius** | N/A | 250k+ reviews | N/A | No public API |
| **Gartner Peer Insights** | N/A | Enterprise software | N/A | No public API |

**Implementation:**
- G2 integration for buyer intent signals (if budget allows)
- Web scraping for review activity (legal gray area)
- Monitor review RSS feeds
- Track review velocity (reviews/month)

**Challenges:**
- G2 is expensive ($36k-50k/year add-on)
- Other review sites lack public APIs
- Scraping is legally risky (terms of service violations)
- Limited to companies actively leaving reviews

**Our Approach:**
- Deprioritize review site signals (expensive, limited coverage)
- Focus on higher-ROI signals (job postings, GitHub, funding)

---

### 10. Conference & Event Signals (MEDIUM VALUE - Confidence: 6/10)

**Why It Matters:** Event attendance and sponsorships reveal technology priorities and active evaluation.

**Signal Types:**
- Conference sponsorships (budget + technology focus)
- Speaker sessions (thought leadership, evangelism)
- Booth presence (active marketing/sales)
- Attendee lists (decision-makers researching)
- Virtual event registrations

**Data Sources:**
| Source | Cost | Coverage | Freshness | API Access |
|--------|------|----------|-----------|------------|
| **Conference Websites** | FREE (scraping) | Event-specific | Pre-event | No APIs |
| **LinkedIn Events** | N/A | Limited | Pre-event | No API |
| **Eventbrite** | FREE (public events) | General events | Real-time | Limited API |
| **Bizzabo** | Enterprise | Enterprise events | Real-time | Yes (via integration) |

**Implementation:**
- Scrape conference sponsor lists (AWS re:Invent, Google Cloud Next)
- Monitor speaker lists for company representation
- Track booth numbers (visibility = budget)
- LinkedIn event attendance (limited visibility)

**Challenges:**
- Attendee lists rarely public (privacy)
- Scraping is manual and time-consuming
- Event data is fragmented across platforms
- Low signal-to-noise ratio

**Our Approach:**
- Focus on sponsorship-level signals (high budget = buying intent)
- Deprioritize attendee-level tracking (privacy + accuracy issues)

---

### 11. Product Launch Signals (HIGH VALUE - Confidence: 8/10)

**Why It Matters:** Product launches indicate investment, growth, and new buyer needs.

**Signal Types:**
- Product Hunt launches
- TechCrunch/tech press coverage
- Press releases (PR Newswire, Business Wire)
- GitHub repository creation + activity
- Landing page creation (new subdomain)
- App store submissions (iOS App Store, Google Play)

**Data Sources:**
| Source | Cost | Coverage | Freshness | API Access |
|--------|------|----------|-----------|------------|
| **Product Hunt API** | FREE (non-commercial), $100-300/mo (commercial) | Tech product launches | Real-time | Yes (GraphQL) |
| **TechCrunch API** | N/A | Tech news | Daily | No official API (RSS) |
| **PR Newswire** | $500-5,000/release | Press releases | Real-time | Yes (RSS/API) |
| **Apple App Store API** | FREE | iOS apps | Daily | Yes (REST) |
| **Google Play Store API** | FREE | Android apps | Daily | Yes (REST) |

**Implementation:**
- Product Hunt API monitoring (free for non-commercial)
- TechCrunch RSS feed parsing
- Press release aggregation (PR Newswire, Business Wire)
- App store scraping for new submissions
- GitHub new repository detection

**Example Signals:**
- Product Hunt launch = New product GTM (go-to-market)
- TechCrunch article = Series A+ funding or major product launch
- App store submission = Mobile-first strategy
- Press release + GitHub repo = Confirmed product launch

---

### 12. Executive Change Signals (HIGH VALUE - Confidence: 8/10)

**Why It Matters:** New executives bring new priorities, budgets, and vendor relationships.

**Signal Types:**
- CEO changes (strategic shift)
- CTO/VP Engineering changes (technology priorities)
- CFO changes (budget reallocation)
- CMO changes (marketing stack overhaul)
- VP Sales changes (CRM/sales tool changes)

**Data Sources:**
| Source | Cost | Coverage | Freshness | API Access |
|--------|------|----------|-----------|------------|
| **LinkedIn** | N/A (scraping) | Professional profiles | Daily | No public API |
| **SEC 8-K Filings** | FREE | US public companies | Real-time | Yes (EDGAR API) |
| **Press Releases** | FREE-$500/mo | Announcements | Real-time | RSS/API |
| **Crunchbase** | $0.03-0.16/request | Private companies | Daily | Yes (REST) |

**Implementation:**
- Monitor SEC 8-K filings for executive changes (public companies)
- LinkedIn profile updates (new job titles)
- Press release monitoring
- Crunchbase for private company leadership changes

**Example Signals:**
- New CTO hire = Technology modernization (6-12 month window)
- VP Engineering promotion = Team expansion (hiring + tooling)
- CFO change = Budget re-evaluation (vendor review)

---

### 13. Website Change Signals (MEDIUM VALUE - Confidence: 6/10)

**Why It Matters:** Website updates reveal product launches, pricing changes, and messaging shifts.

**Signal Types:**
- Pricing page changes (new tiers, price increases/decreases)
- New product pages (launches, features)
- Case study additions (customer wins)
- Team page updates (hiring, leadership)
- Blog content (technology focus, problem awareness)

**Data Sources:**
| Source | Cost | Coverage | Freshness | API Access |
|--------|------|----------|-----------|------------|
| **Visualping** | $10-99/mo | Unlimited pages | Hourly | Yes (API) |
| **changedetection.io** | FREE (open-source), $10-50/mo (hosted) | Unlimited | Configurable | Yes (API) |
| **Hexowatch** | $29-199/mo | 13 monitoring types | Hourly | Yes (API) |
| **Wayback Machine (Archive.org)** | FREE | Historical snapshots | Varies | Yes (REST) |

**Implementation:**
- Monitor competitor pricing pages (daily checks)
- Track new product page creation (subdomain + content)
- Blog content analysis (NLP for topics)
- Screenshot comparison for visual changes

**Example Signals:**
- Pricing page update = GTM strategy change
- New "Enterprise" tier = Upmarket expansion
- Case study for new vertical = Market expansion
- Blog posts about "migration" = Competitive displacement

---

### 14. Competitor Intelligence Signals (HIGH VALUE - Confidence: 7/10)

**Why It Matters:** Companies researching competitors are actively evaluating solutions.

**Signal Types:**
- Competitor website visits (if trackable via first-party analytics)
- Google searches: "CompetitorX vs CompetitorY"
- Review site comparison pages (G2 alternatives)
- Social media competitor mentions
- Job postings mentioning competitor tools (replacements)

**Data Sources:**
| Source | Cost | Coverage | Freshness | API Access |
|--------|------|----------|-----------|------------|
| **Google Trends** | FREE | Search volume trends | Daily | Yes (unofficial APIs) |
| **G2 Buyer Intent** | $36,000-50,000/yr | G2 ecosystem | Daily | Yes (integration) |
| **First-Party Analytics** | FREE | Your website only | Real-time | Yes (GA4, Cloudflare) |
| **SimilarWeb** | $199-999/mo | Website traffic estimates | Monthly | Yes (API) |

**Implementation:**
- Google Trends monitoring for "[YourProduct] vs [Competitor]" searches
- First-party analytics for competitor comparison page visits
- G2 integration for alternative page views
- Job posting monitoring for "migrate from [Competitor]" mentions

**Example Signals:**
- Google Trends spike for "Salesforce vs HubSpot" = CRM evaluation
- G2 comparison page views = Active vendor comparison
- Job posting: "migrate from Oracle to Postgres" = Database migration

---

### 15. Mobile App Activity Signals (MEDIUM VALUE - Confidence: 6/10)

**Why It Matters:** Mobile app updates reveal product strategy, feature launches, and user growth.

**Signal Types:**
- iOS/Android app releases (new features, redesigns)
- App store ratings/reviews (user sentiment)
- Download velocity (growth momentum)
- SDK integrations (technology stack)
- App store optimization changes (messaging, positioning)

**Data Sources:**
| Source | Cost | Coverage | Freshness | API Access |
|--------|------|----------|-----------|------------|
| **Apple App Store API** | FREE | iOS apps | Daily | Yes (REST) |
| **Google Play Store API** | FREE | Android apps | Daily | Yes (REST) |
| **App Annie (data.ai)** | Custom pricing | App analytics | Daily | Yes (API) |
| **Sensor Tower** | Custom pricing | App intelligence | Daily | Yes (API) |

**Implementation:**
- Monitor app version releases (changelog analysis)
- Track rating/review velocity
- Extract SDK usage from app binaries (tech stack)
- Monitor app store description changes

**Example Signals:**
- App launch = Mobile-first strategy
- Major version update (v2.0) = Product relaunch
- New SDK integration (Firebase) = Analytics/crash reporting
- Rating drop = Potential churn opportunity

---

## Signal Scoring & Confidence Methodology

### Weighting Framework

Intent signals should be scored based on **buying readiness**, **confidence**, and **time decay**.

| Signal Type | Confidence Score | Buying Stage | Time Decay | Weight |
|-------------|------------------|--------------|------------|--------|
| **Funding Announcement** | 9/10 | Early (6-12 months) | Slow (12 months) | 9.0 |
| **GitHub Activity** | 9/10 | Mid (3-6 months) | Medium (6 months) | 8.5 |
| **Job Postings** | 8/10 | Mid (3-6 months) | Medium (6 months) | 8.0 |
| **Executive Changes** | 8/10 | Early (6-12 months) | Slow (12 months) | 7.5 |
| **Technographic Changes** | 8/10 | Mid (3-6 months) | Medium (6 months) | 7.5 |
| **Product Launch** | 8/10 | Mid (3-6 months) | Medium (6 months) | 7.5 |
| **Competitor Research** | 7/10 | Late (1-3 months) | Fast (3 months) | 8.0 |
| **Domain/SSL Changes** | 7/10 | Mid (3-6 months) | Medium (6 months) | 6.5 |
| **Firmographic Changes** | 7/10 | Early (6-12 months) | Slow (12 months) | 6.5 |
| **Website Changes** | 6/10 | Mid (3-6 months) | Fast (3 months) | 5.5 |
| **Review Site Activity** | 7/10 | Late (1-3 months) | Fast (3 months) | 7.0 |
| **Content Consumption** | 6/10 | Early-Mid (3-9 months) | Fast (3 months) | 5.0 |
| **Conference Attendance** | 6/10 | Early (6-12 months) | Slow (12 months) | 5.0 |
| **Social Media Mentions** | 5/10 | Early (6-12 months) | Fast (1 month) | 3.5 |
| **Mobile App Activity** | 6/10 | Mid (3-6 months) | Medium (6 months) | 5.5 |

### Time Decay Model

Signals lose relevance over time. Apply exponential decay:

```
signal_score = base_score * e^(-λt)

Where:
- base_score = Initial confidence score (0-10)
- λ = Decay rate (0.1 = slow, 0.5 = medium, 1.0 = fast)
- t = Time since signal occurred (in months)
```

**Example:**
- Funding announcement (λ=0.1): Remains 90% relevant after 1 month, 60% after 6 months
- Social media mention (λ=1.0): Drops to 37% relevance after 1 month, 0.2% after 6 months

### Multi-Signal Aggregation

Combine signals for higher confidence:

**Formula:**
```
account_intent_score = Σ (signal_weight * signal_confidence * time_decay_factor)

confidence_level = "High" if account_intent_score >= 50
confidence_level = "Medium" if account_intent_score >= 25
confidence_level = "Low" if account_intent_score < 25
```

**Example (High Confidence):**
- Series B funding ($30M) = 9.0 * 0.9 (1 month old) = **8.1 points**
- 3 DevOps Engineer job postings = 8.0 * 0.95 (2 weeks old) = **7.6 points**
- GitHub repo "infrastructure-as-code" created = 8.5 * 0.98 (1 week old) = **8.3 points**
- New SSL cert for "api.company.com" = 6.5 * 0.9 (1 month old) = **5.9 points**
- **Total Score: 29.9 → Medium-High Confidence**

### Intent Topics

Classify signals into **intent topics** to understand *what* they're buying:

| Topic | Signals | Example |
|-------|---------|---------|
| **Cloud Migration** | AWS job posting, GitHub Terraform repo, DevOps hiring | "AWS Solutions Architect" job + Terraform repo |
| **CRM Implementation** | Salesforce job posting, pricing page visit, review site activity | G2 "Salesforce alternatives" + "Salesforce Admin" job |
| **Data Warehouse** | Snowflake job posting, data engineer hiring, GitHub SQL repo | "Data Engineer - Snowflake" job + funding announcement |
| **Security/Compliance** | CISO hire, SOC 2 job posting, security blog posts | "Security Engineer" hiring + SOC 2 audit announcement |

---

## Cost Analysis & Pricing Strategy

### Data Source Costs

| Source Category | Monthly Cost (Estimated) | Annual Cost | Cost per Signal |
|-----------------|--------------------------|-------------|-----------------|
| **Job Posting APIs** | $50-200 (Adzuna, JobSpy) | $600-2,400 | $0.001-0.01 |
| **GitHub API** | $0 (FREE, rate-limited) | $0 | $0.00 |
| **SEC EDGAR API** | $0 (FREE) | $0 | $0.00 |
| **Certificate Transparency** | $0 (FREE) | $0 | $0.00 |
| **DNS Monitoring** | $100-300 (SecurityTrails, DNS Spy) | $1,200-3,600 | $0.01-0.05 |
| **Technographic Data** | $500-2,000 (Wappalyzer, TheirStack) | $6,000-24,000 | $0.05-0.20 |
| **Website Monitoring** | $50-200 (Visualping, changedetection.io) | $600-2,400 | $0.01-0.05 |
| **Crunchbase API** | $3,000-16,000/yr (estimated based on usage) | $3,000-16,000 | $0.03-0.16 |
| **Social Media APIs** | $100-1,000 (Twitter, Reddit) | $1,200-12,000 | $0.01-0.10 |
| **Press Release Aggregation** | $100-500 | $1,200-6,000 | $0.01-0.05 |
| **Cloudflare Infrastructure** | $200-1,000 (Workers, R2, D1, Analytics) | $2,400-12,000 | N/A |
| **TOTAL (Estimated)** | $4,100-21,200/month | $49,200-254,400/year | $0.01-0.05/signal avg |

### Infrastructure Costs (Cloudflare)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| **Workers** | 30M+ requests/month | $25 (Paid plan) |
| **D1 Database** | 5GB storage, 25M reads | $5 |
| **R2 Storage** | 100GB storage, 10M reads | $15 |
| **ClickHouse** | 10M events/month | $50-200 |
| **Queues** | 1M messages/month | $5 |
| **Cloudflare Analytics** | Unlimited | $0 (included) |
| **TOTAL** | | $100-250/month |

### Competitive Cost Comparison

| Provider | Annual Cost | Signals per Year (Est.) | Cost per Signal | Our Cost per Signal | Savings |
|----------|-------------|-------------------------|-----------------|---------------------|---------|
| **Bombora** | $20,000-100,000 | 100,000-500,000 | $0.20-0.40 | $0.01-0.05 | 80-95% |
| **6sense** | $55,000-130,000 | 200,000-1,000,000 | $0.13-0.55 | $0.01-0.05 | 85-96% |
| **G2 Buyer Intent** | $36,000-50,000 | 50,000-200,000 | $0.18-0.72 | $0.01-0.05 | 86-97% |
| **ZoomInfo** | $25,000-100,000 | 100,000-500,000 | $0.20-0.50 | $0.01-0.05 | 80-95% |

### Our Pricing Strategy

**Tiered API Pricing:**

| Plan | Monthly Cost | Signals Included | Cost per Additional Signal | Target Customer |
|------|--------------|------------------|---------------------------|-----------------|
| **Starter** | $99 | 10,000 signals/month | $0.01 | Startups, SMBs |
| **Growth** | $299 | 50,000 signals/month | $0.008 | Growing companies |
| **Professional** | $699 | 150,000 signals/month | $0.006 | Mid-market |
| **Enterprise** | $1,999+ | 500,000+ signals/month | $0.004 | Enterprise |

**Key Advantages:**
- 80-95% cheaper than Bombora, 6sense, G2
- No hidden fees or credit systems
- API-first (no platform lock-in)
- Pay-as-you-grow pricing
- Real-time access (not weekly batches)

---

## Privacy & Compliance Strategy

### GDPR Compliance (Article 6)

**Legal Basis: Legitimate Interest (Article 6(1)(f))**

We process **company-level** intent data under legitimate interest because:
1. **Purpose Test:** Commercial interest in identifying potential customers is legitimate if lawful
2. **Necessity Test:** Processing is necessary (no less intrusive alternatives) to provide intent data
3. **Balancing Test:** Benefits to businesses (sales/marketing efficiency) outweigh risks to individuals (minimal, as we focus on company data)

**Key Principles:**
- Focus on **company signals** (funding, job postings, GitHub repos), not personal data
- Do NOT track individuals across websites (no third-party cookies)
- Do NOT create personal profiles or track browsing behavior
- Do NOT de-anonymize IP addresses to individuals
- Use **publicly available data** only (SEC filings, job postings, GitHub, domain records)

### Data We Collect

| Data Type | Personal Data? | Legal Basis | Risk Level |
|-----------|----------------|-------------|------------|
| **Funding announcements** | No (company data) | Legitimate Interest | Low |
| **Job postings** | No (company data, job descriptions) | Legitimate Interest | Low |
| **GitHub activity** | Potentially (contributor emails) | Legitimate Interest | Medium |
| **Domain/SSL changes** | No (company infrastructure) | Legitimate Interest | Low |
| **Technographic data** | No (company tech stack) | Legitimate Interest | Low |
| **Social media mentions** | Potentially (individual posts) | Legitimate Interest | Medium |
| **Executive changes** | Yes (name, title, company) | Legitimate Interest | Medium |
| **Website content** | No (company website) | Legitimate Interest | Low |

### Data We DO NOT Collect

- ❌ Individual browsing behavior across websites
- ❌ Third-party cookies or tracking pixels
- ❌ Personal email addresses (except public job posting contacts)
- ❌ De-anonymized IP addresses mapped to individuals
- ❌ Social security numbers, financial data, health data
- ❌ Location tracking (GPS, precise geolocation)

### Opt-Out Mechanisms

**Company-Level Opt-Out:**
- Any company can request removal from our database
- Process requests within 30 days (GDPR compliance)
- Remove all historical data for opted-out companies

**Individual-Level Opt-Out:**
- Individuals can request removal of their name/title from executive change signals
- Remove personal GitHub contributions from aggregated data

### Competitor Approaches

| Provider | Approach | Privacy Risks |
|----------|----------|---------------|
| **Bombora** | Co-op model with cookies across 5,000+ B2B sites | High (third-party cookies, personal tracking) |
| **6sense** | IP de-anonymization, reverse IP lookup | High (individual identification from IP) |
| **G2** | First-party cookies on G2.com | Medium (limited to G2 ecosystem) |
| **ZoomInfo** | IP-based tracking, bidstream data | High (personal tracking, bidstream privacy concerns) |

### Our Competitive Advantage

**Privacy-First Approach:**
- No third-party cookies or cross-site tracking
- Company-level signals only (not individual tracking)
- Transparent data sources (public records)
- GDPR-compliant legitimate interest
- Clear opt-out process

**Compliance Benefits:**
- Lower legal risk than Bombora/6sense
- Easier to sell to privacy-conscious companies
- Aligns with cookie deprecation trends (Chrome, Safari)
- Future-proof against privacy regulation changes

---

## Technical Implementation Architecture

### Real-Time vs. Batch Processing

**Hybrid Architecture:**
- **Real-Time:** High-value signals (SEC filings, GitHub events, SSL certs, funding announcements)
- **Batch Processing:** Lower-priority signals (job postings, social media, website changes)

**Rationale:**
- Real-time processing is expensive (complex infrastructure, high costs)
- Batch processing is cost-effective for high-volume, less time-sensitive signals
- Hybrid approach balances immediacy with cost

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Data Collection Layer                    │
├─────────────────────────────────────────────────────────────┤
│  Real-Time Sources (Cloudflare Workers + Queues)             │
│  - SEC EDGAR RSS feeds (webhook triggers)                    │
│  - Certificate Transparency logs (polling)                   │
│  - GitHub webhooks (repo changes, releases)                  │
│  - DNS change detection (hourly polling)                     │
│                                                              │
│  Batch Sources (Cloudflare Cron Triggers)                    │
│  - Job postings (daily scraping)                             │
│  - Crunchbase API (daily funding checks)                     │
│  - Website monitoring (daily diff checks)                    │
│  - Social media (daily keyword searches)                     │
│  - Technographic changes (weekly scans)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Signal Processing Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Cloudflare Workers (signal validation, enrichment, scoring) │
│  - Deduplication (avoid duplicate signals)                   │
│  - Confidence scoring (base score + time decay)              │
│  - Intent topic classification (NLP, keyword matching)       │
│  - Company resolution (domain → company name)                │
│  - Multi-signal aggregation (account-level scoring)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                           │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (Neon) - Company profiles, account metadata      │
│  ClickHouse - Time-series signal events (fast analytics)     │
│  R2 Storage - Raw data archives (job postings, website diffs)│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       API Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Cloudflare Workers (Hono API framework)                     │
│  - GET /signals/company/:domain                              │
│  - GET /signals/topic/:topic (e.g., "cloud-migration")       │
│  - GET /signals/recent (real-time feed)                      │
│  - Webhooks (push notifications for high-value signals)      │
│  - GraphQL API (flexible querying)                           │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Why? |
|-------|------------|------|
| **API Gateway** | Cloudflare Workers (Hono) | Edge computing, low latency, pay-per-request |
| **Data Processing** | Cloudflare Workers + Queues | Serverless, auto-scaling, cost-effective |
| **Real-Time DB** | PostgreSQL (Neon) | ACID compliance, relational data, company profiles |
| **Analytics DB** | ClickHouse | Fast time-series queries, 100M+ events/sec |
| **Storage** | Cloudflare R2 | S3-compatible, no egress fees, archive raw data |
| **Scheduling** | Cloudflare Cron Triggers | Built-in scheduling, no separate infrastructure |
| **Monitoring** | Cloudflare Analytics + Sentry | Real-time error tracking, performance monitoring |

### Data Collection Workflows

**Real-Time Workflow (SEC Filings Example):**
1. SEC EDGAR RSS feed emits new Form D filing
2. Cloudflare Worker receives webhook
3. Parse filing XML → Extract company name, funding amount, investors
4. Enrich with Crunchbase data (company domain, industry, employee count)
5. Calculate confidence score (9/10 for funding signals)
6. Store in PostgreSQL (company profile) + ClickHouse (signal event)
7. Trigger webhook to customers subscribed to this company
8. Total latency: < 5 seconds

**Batch Workflow (Job Postings Example):**
1. Cloudflare Cron Trigger runs daily at 2 AM UTC
2. Scrape target companies' career pages (JobSpy library)
3. Compare with previous day's snapshot (diff detection)
4. Extract new job postings → NLP for tech stack, seniority, location
5. Calculate confidence score (8/10 for job posting signals)
6. Store in PostgreSQL + ClickHouse
7. Batch update to customers (daily digest emails)
8. Total latency: 1-24 hours (acceptable for job postings)

### Scaling Considerations

**Cloudflare Workers Benefits:**
- Auto-scaling (handles 0 to 1M+ requests/sec)
- Pay-per-request (no idle server costs)
- Global edge network (low latency worldwide)
- 0ms cold starts (unlike AWS Lambda)

**Cost Projections:**
- **Starter Plan (10k signals/mo):** ~$100/month infrastructure
- **Growth Plan (50k signals/mo):** ~$300/month infrastructure
- **Professional Plan (150k signals/mo):** ~$700/month infrastructure
- **Enterprise Plan (500k+ signals/mo):** ~$2,000/month infrastructure

**Margins:**
- Starter: 0% margin (customer acquisition)
- Growth: 0% margin (breakeven)
- Professional: 0% margin (slight profit)
- Enterprise: 50%+ margin (highly profitable)

---

## Implementation Roadmap

### Phase 1: MVP (Months 1-2) - Foundation

**Goals:**
- Prove concept with 5 high-value signal sources
- Build API infrastructure
- Onboard 10 beta customers

**Signal Sources:**
1. ✅ Job Postings (JobSpy, Adzuna API) - FREE
2. ✅ GitHub Activity (GitHub REST API) - FREE
3. ✅ SEC EDGAR Filings (EDGAR API) - FREE
4. ✅ Domain/SSL Changes (Certificate Transparency) - FREE
5. ✅ Funding Announcements (Crunchbase API) - $3k-16k/year

**Deliverables:**
- [ ] Cloudflare Workers API (Hono framework)
- [ ] PostgreSQL schema (company profiles, signals)
- [ ] ClickHouse schema (time-series events)
- [ ] 5 data collection workers (real-time + batch)
- [ ] Signal scoring engine (confidence + time decay)
- [ ] Basic API endpoints (GET /signals/company/:domain)
- [ ] API documentation (OpenAPI spec)
- [ ] 10 beta customers onboarded

**Success Metrics:**
- 100,000+ signals collected
- 500+ companies tracked
- 10 beta customers using API
- 95%+ API uptime

### Phase 2: Signal Expansion (Months 3-4) - Scale

**Goals:**
- Add 5 more signal sources
- Improve signal scoring
- Reach 50 customers

**Signal Sources:**
6. ✅ Technographic Data (Wappalyzer API) - $500-2k/month
7. ✅ Website Changes (Visualping API) - $50-200/month
8. ✅ Executive Changes (LinkedIn scraping + SEC 8-K filings) - FREE
9. ✅ Product Launches (Product Hunt API) - FREE-$300/month
10. ✅ Social Media Mentions (Reddit API) - FREE

**Deliverables:**
- [ ] 5 additional data collection workers
- [ ] Multi-signal aggregation (account-level scoring)
- [ ] Intent topic classification (NLP, 10+ topics)
- [ ] Webhook notifications (real-time push)
- [ ] GraphQL API (flexible querying)
- [ ] Customer dashboard (basic UI)
- [ ] 50 paying customers

**Success Metrics:**
- 500,000+ signals collected
- 2,000+ companies tracked
- 50 paying customers
- $5,000+ MRR

### Phase 3: Advanced Features (Months 5-6) - Differentiation

**Goals:**
- Add remaining signal sources
- Build competitive moats (AI, predictive scoring)
- Reach 200 customers

**Signal Sources:**
11. ✅ Review Site Activity (G2 integration or scraping) - $36k-50k/year OR FREE (scraping)
12. ✅ Conference Attendance (web scraping) - FREE
13. ✅ DNS Monitoring (SecurityTrails API) - $1.2k-3.6k/year
14. ✅ Mobile App Activity (App Store APIs) - FREE
15. ✅ Competitor Intelligence (Google Trends, SimilarWeb) - FREE-$999/month

**Deliverables:**
- [ ] All 15 signal sources operational
- [ ] AI-powered intent scoring (ML model for prediction)
- [ ] Predictive lead scoring (predict buying window)
- [ ] Lookalike audience discovery (find similar companies)
- [ ] Advanced dashboard (charts, trends, alerts)
- [ ] CRM integrations (Salesforce, HubSpot)
- [ ] 200 paying customers

**Success Metrics:**
- 2,000,000+ signals collected
- 10,000+ companies tracked
- 200 paying customers
- $50,000+ MRR

---

## Competitive Positioning

### Key Differentiators

| Feature | Bombora | 6sense | G2 Buyer Intent | **Our Platform** |
|---------|---------|--------|-----------------|------------------|
| **Pricing** | $20k-100k/year | $55k-130k/year | $36k-50k/year | **$99-1,999/month** |
| **Signal Sources** | 5,000+ B2B sites (co-op) | IP tracking, third-party data | G2 ecosystem only | **15+ diverse sources** |
| **Real-Time** | Weekly batches | Daily batches | Daily batches | **Hourly/Real-time** |
| **API-First** | Platform-first, limited API | Platform-first, limited API | Platform-first, no API | **API-first, GraphQL** |
| **Privacy** | Third-party cookies | IP de-anonymization | First-party cookies | **Company signals only** |
| **Target Market** | Enterprise | Enterprise | Mid-Market to Enterprise | **SMB to Enterprise** |
| **Setup Time** | 4-8 weeks | 8-12 weeks | 2-4 weeks | **< 1 day (API key)** |
| **Multi-Signal** | Limited | Yes (proprietary) | Limited | **Yes (transparent)** |

### Go-to-Market Strategy

**Target Customers:**
1. **B2B SaaS startups** (Series A-C) - Need affordable intent data, growth-focused
2. **Sales intelligence platforms** - Integrate our API into their products
3. **Marketing agencies** - Identify high-intent accounts for clients
4. **Investment firms** - Track portfolio company growth signals
5. **RevOps teams** - Data-driven lead prioritization

**Positioning:**
- **"The Affordable Intent Data API"** - 80-95% cheaper than Bombora/6sense
- **"Real-Time Buyer Signals"** - Hourly updates vs. weekly batches
- **"API-First Intent Data"** - Developer-friendly, no platform lock-in
- **"Privacy-First Intelligence"** - Company signals, no personal tracking

**Marketing Channels:**
1. **Product Hunt launch** (Day 1 visibility)
2. **Reddit/Hacker News** (technical audience, API-first resonates)
3. **Developer communities** (Dev.to, GitHub sponsors)
4. **Sales/RevOps communities** (LinkedIn, SalesHacker)
5. **Content marketing** (intent data guides, competitor comparisons)

---

## Next Steps & Action Items

### Immediate (Week 1)
1. ✅ Research completed (this document)
2. [ ] Validate pricing strategy with potential customers (10 interviews)
3. [ ] Set up Cloudflare infrastructure (Workers, D1, R2, ClickHouse)
4. [ ] Design PostgreSQL + ClickHouse schemas
5. [ ] Implement first signal source (SEC EDGAR filings) - highest ROI

### Short-Term (Weeks 2-4)
1. [ ] Build 4 additional MVP signal sources (job postings, GitHub, SSL, funding)
2. [ ] Implement signal scoring engine (confidence + time decay)
3. [ ] Create API endpoints (REST + GraphQL)
4. [ ] Write API documentation (OpenAPI spec)
5. [ ] Recruit 10 beta customers (free access, feedback-driven development)

### Medium-Term (Months 2-3)
1. [ ] Launch public beta (Product Hunt, Hacker News)
2. [ ] Add 5 more signal sources (technographics, website changes, executives, product launches, social media)
3. [ ] Build customer dashboard (basic UI for non-technical users)
4. [ ] Implement webhook notifications (real-time push)
5. [ ] Onboard 50 paying customers ($5k MRR target)

### Long-Term (Months 4-6)
1. [ ] Complete all 15 signal sources
2. [ ] Build AI-powered predictive scoring (ML model)
3. [ ] Add CRM integrations (Salesforce, HubSpot, Pipedrive)
4. [ ] Launch enterprise tier (custom signals, white-label API)
5. [ ] Scale to 200+ customers ($50k+ MRR target)

---

## Conclusion

The B2B intent data market is ripe for disruption. Incumbents (Bombora, 6sense, G2) charge $20,000-$200,000+ annually for limited signal sources, weekly batch updates, and platform-first architectures. Their pricing excludes SMBs, startups, and cost-conscious mid-market companies.

**Our opportunity:**
- Aggregate 15+ free/low-cost signal sources (job postings, GitHub, SEC filings, DNS/SSL, technographics)
- Deliver real-time signals via API-first architecture
- Offer transparent pricing ($99-1,999/month) - 80-95% cheaper
- Focus on company-level signals (privacy-first, GDPR-compliant)
- Target underserved SMB and developer markets

**Key success factors:**
1. **Signal quality over quantity** - Multi-source validation for high confidence
2. **Developer experience** - API-first, great docs, fast onboarding
3. **Transparent pricing** - No hidden fees, credits, or complex contracts
4. **Privacy-first** - Company signals only, no personal tracking
5. **Fast time-to-value** - API key → first signal in < 1 hour

**Estimated financials:**
- **Infrastructure costs:** $4,100-21,200/month (including data sources)
- **Target pricing:** $99-1,999/month per customer
- **Break-even:** ~50-100 customers (depends on tier mix)
- **12-month goal:** 200+ customers, $50k+ MRR, 50%+ gross margins

**Competitive moats:**
- Multi-source signal aggregation (hard to replicate)
- Real-time architecture (technical complexity)
- API-first developer experience (cultural advantage)
- Privacy-first positioning (regulatory advantage)

This research provides a comprehensive foundation to build a competitive B2B intent data API. The next step is to validate assumptions with customer interviews and begin MVP development.

---

**Document Version:** 1.0
**Last Updated:** 2025-10-03
**Author:** Research compiled for .do data-ingestion project
**Next Review:** After customer validation interviews
