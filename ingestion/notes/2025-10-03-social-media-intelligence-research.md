# Social Media Intelligence Data Sources Research
## Building a Superior Social Listening API to Compete with Enterprise Solutions

**Research Date:** October 3, 2025
**Target Market:** SMB-focused social media intelligence API
**Competitive Position:** Undercut Brandwatch ($800-3,000/mo), Sprout Social ($249-499/user/mo), Hootsuite Insights ($739+/mo)

---

## Executive Summary

The social media intelligence market is dominated by expensive enterprise platforms (Brandwatch, Sprout Social, Hootsuite) with pricing that excludes small and medium businesses. Our research identifies a significant market opportunity to build an API-first, SMB-friendly social listening platform leveraging:

1. **Free/Low-Cost Data Sources:** Twitter API Free tier (1,500 tweets/mo), Reddit API (100 req/min FREE), YouTube API (10k units/day FREE), open-source sentiment analysis
2. **Cost-Effective Infrastructure:** Cloudflare Workers + R2 + D1 for near-zero egress fees and low storage costs
3. **Competitive Pricing Strategy:** Target $49-199/mo (10-20x cheaper than enterprise competitors)
4. **Expanded Platform Coverage:** Include Reddit, Hacker News, Product Hunt (platforms competitors ignore)
5. **Real-Time + API-First Architecture:** Faster updates than competitors' batch processing, direct API access vs dashboard-only

**Market Size:** Influencer marketing alone is projected to surpass $24 billion in 2025, with social listening being a critical component.

**Key Differentiator:** While competitors target Fortune 500 companies with $1,000+/month contracts, we can serve the 99% of businesses that can't afford enterprise pricing by building on modern, cost-effective infrastructure and focusing on high-value, publicly accessible data.

---

## 1. Platform Data Sources & API Analysis

### 1.1 Twitter/X API v2

**Official Pricing Tiers (2025):**

| Tier | Cost | Read Limit | Write Limit | Best For |
|------|------|-----------|-------------|----------|
| **Free** | $0/mo | 0 posts/mo (write-only) | 1,500 tweets/mo | Basic posting, testing |
| **Basic** | $100/mo | 10,000 tweets/mo | 50,000 tweets/mo | Small-scale monitoring |
| **Pro** | $5,000/mo | 1,000,000 tweets/mo | 300,000 tweets/mo | Professional monitoring |
| **Enterprise** | $10,000+/mo | Unlimited (Full Firehose) | Unlimited | Large-scale commercial |

**Rate Limits:**
- Standard tier: 300-500 requests per 15-minute window
- User authentication: 450 requests per 15-minute window
- Search API: Limited to recent 7 days (Free/Basic), 30 days (Pro)

**Available Data:**
- Tweet content, metadata, engagement metrics (likes, retweets, replies)
- User profiles, follower counts, verification status
- Trending topics and hashtags (via Trends API)
- Geographic data (when available)
- Media (photos, videos, GIFs)

**Limitations:**
- Historical data requires Enterprise tier
- Free tier is write-only (no reading/monitoring capability)
- Basic tier's 10k tweets/month = ~333 tweets/day (very limited for brand monitoring)

**Cost Analysis:**
- **Competitor Baseline:** Brandwatch charges $800-3,000/mo for unlimited Twitter monitoring
- **Our Position:** Start with Basic tier ($100/mo) + supplement with alternative data sources
- **Break-Even:** Need to charge customers $150-200/mo to be profitable on Twitter data alone

**Strategic Recommendation:**
- Use Twitter API Basic tier for verified, real-time data
- Supplement with public scraping for historical analysis (legal if public data)
- Focus on high-value keywords rather than comprehensive firehose
- Offer tiered plans based on keyword/mention volume

---

### 1.2 Reddit API

**Pricing:** **FREE** (best value in social listening)

**Rate Limits:**
- OAuth authenticated: **100 queries per minute (QPM)** per client ID
- Average over 10-minute window (supports bursting)
- Unauthenticated requests: Blocked (authentication mandatory)

**Available Data:**
- Posts, comments, scores (upvotes/downvotes)
- Subreddit information, subscriber counts
- User profiles (when not private)
- Post timestamps, awards, gilding
- Nested comment threads
- Trending posts (hot, rising, top, controversial)

**API Capabilities:**
- PRAW (Python Reddit API Wrapper) - mature open-source library
- Real-time streaming via WebSocket
- Historical data via Pushshift archives (community-maintained)
- Subreddit-specific monitoring
- Keyword search across all subreddits

**Strategic Value:**
- **100% FREE** for applications under 100 QPM (sufficient for most SMB use cases)
- Extremely high-quality discussions (longer-form than Twitter)
- Strong community sentiment (upvote/downvote system = built-in sentiment)
- Often overlooked by enterprise competitors (major opportunity)
- Technical/B2B audiences heavily represented

**Competitive Advantage:**
- **Brandwatch, Sprout Social charge $800-3,000/mo** but provide limited Reddit coverage
- We can offer **superior Reddit monitoring at $0 API cost**
- 100 req/min = 6,000 req/hr = 144,000 req/day = **massive coverage for free**

**Use Cases:**
- Product launches (monitor /r/ProductManagement, industry subreddits)
- Customer support (brand mentions, product issues)
- Competitive intelligence (competitor discussions)
- Market research (pain points, feature requests)

---

### 1.3 LinkedIn API

**Access Requirements:**
- Must be approved LinkedIn Partner (difficult to obtain)
- Partnership program has strict requirements
- Not publicly available for general developers

**Estimated Pricing (for Partners):**
- People Profile API: $59+/mo (limited access)
- Company Profile API: $699+/mo
- Professional Plan: $599/mo (15,000 requests/day)
- Enterprise Plan: $2,999/mo (unlimited access)

**Rate Limits:**
- Daily request limits (varies by partnership tier)
- 429 error code when exceeded (temporary suspension)

**Available Data (for Partners):**
- Company pages, follower growth
- Post engagement (likes, comments, shares)
- Employee profiles (limited by privacy settings)
- Job postings (hiring signals)
- LinkedIn Groups (if accessible)

**Limitations:**
- **Extremely restricted access** (must apply to partner program)
- High costs for approved partners
- Limited organic/public data access
- Privacy restrictions limit profile data
- Most free data requires user authorization (OAuth)

**Strategic Recommendation:**
- **Skip official API** for initial launch (too expensive, restricted)
- Focus on publicly accessible LinkedIn data (company pages, public posts)
- Offer as "premium add-on" tier once partnership secured
- Alternative: Use third-party LinkedIn data providers (Proxycurl, Bright Data)

**Third-Party Options:**
- Proxycurl: $79+/mo for LinkedIn data
- Bright Data: Pay-per-use LinkedIn scraping (legally defensible)

---

### 1.4 Instagram Graph API

**Pricing:** **FREE** (Meta does not charge for Graph API usage)

**Rate Limits:**
- 200 requests per user per hour (standard)
- Comments endpoint: 60 writes per user per hour
- Business Use Case (BUC) Rate Limits apply
- API-published posts: 25 posts per 24 hours

**Requirements:**
- Instagram Business or Creator account required
- Facebook Developer account
- App review for advanced features

**Available Data:**
- Media insights (likes, comments, saves, reach, impressions)
- Profile metrics (followers, following)
- Hashtag performance
- Story views and engagement
- Account demographics (age, gender, location)
- Comment moderation capabilities

**Limitations:**
- **Only works for accounts you manage** (cannot monitor competitors)
- Cannot access other users' posts or engagement without authorization
- Historical data limited to 24 months
- Rate limits can be restrictive for high-volume applications

**Strategic Value:**
- **Free** for monitoring customer's own accounts
- Useful for "social media management" features (content scheduling, analytics)
- Complements competitor monitoring from other platforms

**Competitive Positioning:**
- Offer Instagram analytics as "value-add" for customers' own accounts
- Cannot compete with Brandwatch/Sprout Social for competitor monitoring
- Best suited for agency/brand management features

---

### 1.5 TikTok API

**Access Requirements:**
- Developer registration required
- App approval process (3-4 days wait time)
- Must work with real business or research group
- Strict compliance with TikTok's rules and policies

**Pricing:** **FREE** for approved developers (basic access)

**Rate Limits:**
- Unaudited clients: 5 users can post within 24 hours
- Unaudited clients: Posts limited to SELF_ONLY viewership
- Higher limits available by contacting TikTok support (requires review)

**Available Data:**
- Video metadata (views, likes, comments, shares)
- User profiles (public data)
- Trending content (hashtags, sounds, challenges)
- Analytics for owned accounts

**Limitations:**
- **Approval process is restrictive** (not all applications accepted)
- Limited data for third-party monitoring
- Focus on content posting rather than listening
- Still evolving API (features added regularly)

**Strategic Recommendation:**
- **Apply for TikTok partnership early** (long approval process)
- Offer as "beta" feature once approved
- Consider web scraping for public TikTok data (via TikAPI or similar services)
- TikTok monitoring is high-value differentiator (few competitors offer it)

**Third-Party Options:**
- TikAPI: Unofficial API with better monitoring capabilities
- Pricing: Contact for custom quote

---

### 1.6 YouTube Data API v3

**Pricing:** **FREE** (Google does not charge for API usage)

**Quota System:**
- Default quota: **10,000 units per day** per project
- Search query: 100 units (=100 searches/day)
- Video details: 1 unit (=10,000 queries/day)
- Channel details: 1 unit
- Comment threads: 1 unit

**Higher Quotas:**
- Request increase via Google Cloud Console
- Approval based on use case and compliance
- No monetary charge for higher quotas

**Available Data:**
- Video performance (views, likes, dislikes, comments)
- Channel analytics (subscriber growth, video uploads)
- Comment sentiment and threads
- Trending videos (by category, region)
- Search results (videos matching keywords)
- Video transcripts (via separate Caption API)

**Rate Limits:**
- Quota-based system (not time-based like other APIs)
- Resets daily at midnight Pacific Time

**Strategic Value:**
- **Completely free** for extensive monitoring
- 10,000 units/day = 100 searches + 9,000+ detail queries
- Excellent for brand mention tracking in video titles/descriptions
- Comments provide rich sentiment data
- Often overlooked by social listening tools (opportunity)

**Use Cases:**
- Product review monitoring (track brand mentions in video titles)
- Influencer identification (channel growth, engagement rates)
- Competitor analysis (track competitor channel performance)
- Content trend analysis (trending topics, viral videos)

---

### 1.7 Facebook Graph API

**Pricing:** **FREE** for standard use

**Rate Limits:**
- Rate limiting applies (no public "pay to increase" option)
- Business Use Case (BUC) limits for Marketing API
- Insights requests have separate rate considerations
- Latest version: v22.0 (as of 2025)

**Available Data (for pages you manage):**
- Page insights (likes, reach, engagement)
- Post performance (likes, comments, shares, reach)
- Audience demographics (age, gender, location)
- Video views and performance
- Event data (if managing events)

**Limitations:**
- **Cannot monitor competitors' Facebook pages** (major limitation)
- Only works for pages/accounts you have permission to access
- Rate limits are opaque and not publicly documented
- Historical data access varies by permissions

**Strategic Value:**
- Good for managing customer's own Facebook presence
- Limited value for competitive intelligence/brand monitoring
- Useful for "social media management" product features

**Competitive Note:**
- Sprout Social, Brandwatch charge $249-3,000/mo but also cannot monitor competitor Facebook pages (platform restriction)
- Our pricing can match their Facebook features at fraction of cost

---

### 1.8 Hacker News API

**Pricing:** **FREE** (Firebase-hosted API)

**Rate Limits:** **NONE** (no current rate limit)

**API Access:**
- Base URL: `https://hacker-news.firebaseio.com/v0/`
- Real-time access to public HN data
- REST API with JSON responses

**Available Data:**
- Stories (posts), comments, user profiles
- Points (upvotes), rankings
- Top stories, new stories, best stories
- Ask HN, Show HN, Job posts
- User karma, submission history

**Strategic Value:**
- **100% FREE with NO RATE LIMITS** (exceptional value)
- High-quality tech/startup audience
- Product launches heavily discussed
- B2B/SaaS competitive intelligence
- **Zero competitors monitor HN** (massive differentiator)

**Use Cases:**
- Product launch monitoring (Show HN, Ask HN posts)
- Startup competitive intelligence
- Tech trend analysis
- Hiring/talent acquisition signals
- Developer sentiment toward technologies

**Implementation:**
- Use Firebase REST API directly
- Build real-time monitoring via polling (every 1-5 minutes)
- Store historical data for trend analysis

---

### 1.9 Product Hunt (via Unofficial APIs)

**Official API:** Deprecated (Product Hunt shut down public API)

**Alternative Access:**
- Web scraping (legal for public data)
- Third-party services (RapidAPI, ScrapeHero)
- RSS feeds (limited data)

**Available Data:**
- Product launches (daily ranked list)
- Upvotes, comments, makers
- Hunter/maker profiles
- Product categories, tags
- Launch success metrics

**Strategic Value:**
- **Critical for startup/product intelligence**
- Early signal for new competitors
- Product-market fit indicators (upvotes, comments)
- No enterprise competitors monitor Product Hunt

**Implementation Complexity:**
- Requires web scraping infrastructure
- Monitor daily launch list
- Track product performance over time

**Compliance:**
- Public data scraping is legal (hiQ vs. LinkedIn precedent)
- Must respect robots.txt
- Cannot create account to scrape private data

---

## 2. Sentiment Analysis Solutions

### 2.1 Open-Source / Free Solutions

#### VADER (Valence Aware Dictionary and sEntiment Reasoner)

**Pricing:** **FREE** (MIT License)

**Accuracy:**
- 63.3% accuracy on crowdsourced human annotations
- 24% match rate with manual labeling on Twitter data
- **Optimized for social media text** (Twitter, Facebook)

**Strengths:**
- Handles emojis, slang, capitalization (e.g., "GREAT" > "great")
- Considers negation ("not good" = negative)
- Punctuation awareness ("!!!" increases intensity)
- Fast processing (rule-based, no ML training required)

**Best Use Cases:**
- Social media posts (Twitter, Facebook, Instagram)
- Short-form content
- Informal text with emojis and slang

**Limitations:**
- Lower accuracy on formal text (news articles, blogs)
- No context understanding (sarcasm detection poor)
- English-only (no multi-language support)

**Implementation:**
```python
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
analyzer = SentimentIntensityAnalyzer()
scores = analyzer.polarity_scores("I love this product! 😍")
# Returns: {'neg': 0.0, 'neu': 0.192, 'pos': 0.808, 'compound': 0.875}
```

---

#### TextBlob

**Pricing:** **FREE** (MIT License)

**Accuracy:**
- 41.3% accuracy on crowdsourced human annotations
- 35% match rate with manual labeling on Twitter data
- Based on Pattern library (customer review lexicon)

**Strengths:**
- Easy to implement (built on NLTK)
- Good for longer, formal text (news articles, reviews)
- Includes subjectivity scoring (objective vs subjective)

**Best Use Cases:**
- Customer reviews
- Blog posts, articles
- Product descriptions

**Limitations:**
- Poor performance on social media text
- Doesn't handle emojis or slang well
- Lower accuracy than VADER for informal text

**Implementation:**
```python
from textblob import TextBlob
text = "This product is amazing!"
blob = TextBlob(text)
sentiment = blob.sentiment  # polarity: -1 to 1, subjectivity: 0 to 1
```

---

#### Ensemble Approach (VADER + TextBlob)

**Accuracy:** **70% match rate** with manual labeling (averaging both)

**Recommendation:** Use weighted average of VADER (70%) + TextBlob (30%) for best results

---

### 2.2 Commercial Sentiment APIs

#### Aylien Text Analysis API

**Pricing:**
- Basic: $49/mo (50,000 API calls)
- Standard: $99/mo
- Custom: Contact for enterprise pricing

**Accuracy:** Higher than open-source (70-80%+ claimed)

**Features:**
- Multi-language sentiment (50+ languages)
- Entity recognition (people, places, brands)
- Aspect-based sentiment (sentiment toward specific features)
- News-specific training data

**Best For:**
- Multi-language monitoring
- News article analysis
- Enterprise clients requiring high accuracy

---

#### MonkeyLearn

**Pricing:**
- Starter: $299/mo
- Professional: $599/mo (conflicting sources show $119-299/mo)
- Enterprise: $1,299+/mo

**Accuracy:** Customizable (train your own models)

**Features:**
- Custom sentiment models (train on your data)
- Industry-specific models (e-commerce, hospitality, tech)
- Topic classification
- Keyword extraction

**Best For:**
- Businesses with industry-specific sentiment needs
- Custom model training
- High-volume API usage (500k+ calls/month)

---

#### OpenAI / Anthropic APIs (LLM-based)

**Pricing:**
- OpenAI GPT-4: ~$0.01-0.03 per 1K tokens (expensive at scale)
- Claude 3: Similar pricing

**Accuracy:** 80-90%+ (state-of-the-art)

**Features:**
- Best sarcasm/irony detection
- Contextual understanding (conversation threads)
- Multi-language support
- Explain sentiment reasoning

**Best For:**
- Premium tier (high-value customers)
- Complex sentiment analysis (sarcasm, context)
- Quality over volume

**Cost Analysis:**
- Average social post: 50-100 tokens
- 1M posts = $500-3,000 (expensive for scale)
- Use for "premium insights" feature (not bulk processing)

---

### 2.3 Recommended Sentiment Strategy

**Tier 1 (Free) - SMB Customers ($49-99/mo plans):**
- VADER + TextBlob ensemble (70% accuracy, $0 cost)
- Fast processing (10k+ posts/second)
- Emoji sentiment lookup table

**Tier 2 (Low-Cost) - Growth Customers ($199-299/mo plans):**
- Aylien API ($49-99/mo for 50k-100k calls)
- Multi-language support
- Higher accuracy (75-80%)

**Tier 3 (Premium) - Enterprise Customers ($499+/mo plans):**
- OpenAI/Claude for complex analysis
- Custom MonkeyLearn models
- Human-in-the-loop validation

---

## 3. Influencer Identification Metrics

### 3.1 Follower Tiers

| Tier | Follower Count | Typical Engagement Rate | Best For |
|------|---------------|------------------------|----------|
| **Nano** | 1K - 10K | 5-8%+ | Niche communities, authenticity |
| **Micro** | 10K - 100K | 3-5% | Cost-effective partnerships |
| **Macro** | 100K - 1M | 1.5-3% | Broader reach, brand awareness |
| **Mega** | 1M+ | 0.5-2% | Mass market campaigns |

### 3.2 Engagement Rate Calculation

**Formula:**
```
Engagement Rate (ER) = (Likes + Comments + Shares + Saves) / Followers × 100
```

**2025 Benchmarks (Instagram):**
- Overall average: **2.2%**
- Top 25% of brands: **1.02%** (median)
- Good engagement: **3%+**
- Industry average: **0.70%** across all sectors
- Excellent engagement: **5%+** (rare, typically nano/micro influencers)

**Platform Variations:**
- TikTok: 5-10% average (higher than Instagram)
- YouTube: 1-3% average (calculated on views, not followers)
- Twitter: 0.5-1% average (lower engagement platform)

### 3.3 Authenticity Score (Fake Follower Detection)

**Detection Signals:**
- Sudden follower spikes (100%+ growth in 24-48 hours)
- Low engagement relative to follower count (< 0.5% ER)
- Generic comments ("Nice pic!", "Great!", "😍")
- High follower-to-following ratio (but low engagement)
- Inactive followers (accounts with no posts, 0 followers)

**Algorithm Approach:**
1. **Engagement Rate Check:** Flag if ER < 0.5% for accounts > 10K followers
2. **Growth Pattern Analysis:** Detect sudden spikes in follower graph
3. **Comment Quality Analysis:** Use NLP to detect bot-like comments
4. **Follower Profile Analysis:** Sample followers, check for inactive accounts
5. **Authenticity Score:** 0-100 (100 = completely authentic)

**Industry Standards:**
- HypeAuditor: 95%+ fraud detection accuracy (ML-based)
- Typical fake follower percentage: 5-15% of an account's total
- Instagram estimated: 95M fake accounts (~10% of platform)

**Implementation:**
- Use Twitter/Instagram APIs to fetch recent comments
- Analyze comment patterns (NLP for generic phrases)
- Check follower growth history (fetch historical data)
- Calculate engagement rate over last 30 posts
- Assign authenticity score (weighted algorithm)

---

### 3.4 Reach & Impression Estimation

**Estimated Reach Formula:**
```
Estimated Reach = Followers × Average Impression Rate
```

**Impression Rate by Platform:**
- Instagram: 10-20% of followers see each post (algorithm-driven)
- Twitter: 5-10% organic reach (without retweets)
- TikTok: Highly variable (viral content can reach 100x followers)
- YouTube: 5-15% of subscribers watch each video

**Engagement-Weighted Reach:**
```
Weighted Reach = Estimated Reach × (1 + Engagement Rate)
```
This accounts for viral potential (high engagement = more visibility).

---

### 3.5 Niche Relevance Scoring

**How to Calculate:**
1. Extract hashtags, bio keywords, post topics (NLP)
2. Compare against target industry keywords
3. Calculate overlap percentage
4. Assign relevance score (0-100)

**Example:**
- Target: "fitness" brand
- Influencer posts: 70% fitness, 20% nutrition, 10% lifestyle
- Niche relevance: 90% (fitness + nutrition)

**Implementation:**
- Use topic modeling (LDA, BERTopic) on influencer content
- Build industry keyword database
- Calculate cosine similarity between influencer topics and brand keywords

---

## 4. Competitive Intelligence Metrics

### 4.1 Share of Voice (SOV)

**Formula:**
```
Share of Voice = (Your Brand Mentions / Total Category Mentions) × 100
```

**Example:**
- Your brand: 1,000 mentions
- Competitor A: 1,500 mentions
- Competitor B: 800 mentions
- Competitor C: 700 mentions
- Total: 4,000 mentions
- **Your SOV: 25%** (1,000 / 4,000)

**Why It Matters:**
- SOV correlates with market share (industry research)
- Track growth over time (increasing SOV = brand awareness growing)
- Benchmark against competitors

**Platform Breakdown:**
- Calculate SOV separately by platform (Twitter SOV, Reddit SOV, etc.)
- Identify strongest platforms (where you "own" the conversation)

---

### 4.2 Sentiment Comparison

**Metric:**
```
Sentiment Score = (Positive Mentions - Negative Mentions) / Total Mentions
```

**Competitive Benchmark:**
- Your brand: +60% sentiment (600 positive, 300 neutral, 100 negative)
- Competitor A: +40% sentiment (500 positive, 300 neutral, 200 negative)
- **You have 20% better sentiment** (customer satisfaction indicator)

**Sentiment Breakdown:**
| Brand | Positive | Neutral | Negative | Net Sentiment |
|-------|----------|---------|----------|---------------|
| Yours | 60% | 30% | 10% | +50% |
| Comp A | 50% | 30% | 20% | +30% |
| Comp B | 40% | 35% | 25% | +15% |

---

### 4.3 Engagement Comparison

**Metric:**
```
Average Engagement = Total Engagements / Total Mentions
```

**Example:**
- Your brand: 5,000 engagements on 1,000 mentions = 5 engagements/mention
- Competitor: 3,000 engagements on 1,500 mentions = 2 engagements/mention
- **You have 2.5x higher engagement quality**

**Why It Matters:**
- Higher engagement = more passionate audience
- Low engagement despite high mentions = awareness without loyalty
- Track engagement trend (growing or declining)

---

### 4.4 Audience Overlap

**Metric:** Percentage of followers/engagers in common

**Implementation:**
1. Fetch your brand's engaged users (likers, commenters, retweeters)
2. Fetch competitor's engaged users
3. Calculate intersection (users who engage with both)
4. Audience Overlap % = Shared Users / Total Unique Users

**Why It Matters:**
- High overlap (> 30%) = direct competition for same audience
- Low overlap (< 10%) = different target markets (opportunity to expand)
- Identify "switchers" (users who engage with competitor more than you)

**Privacy Note:** This requires user-level data (may violate platform ToS if done at scale). Use aggregated/anonymized data.

---

### 4.5 Trending Topics / Conversation Themes

**Implementation:**
- Extract frequent hashtags, keywords, phrases from mentions
- Use topic modeling (LDA, NMF) to identify themes
- Compare your brand's themes vs competitors

**Example Insight:**
- Your brand: 60% of mentions discuss "customer service" (negative)
- Competitor: 60% of mentions discuss "product quality" (positive)
- **Action:** Improve customer service to match competitor's product focus

---

## 5. Cost Analysis & Pricing Strategy

### 5.1 Competitor Pricing

| Platform | Starting Price | Target Customer | Limitations |
|----------|---------------|-----------------|-------------|
| **Brandwatch** | $800-3,000/mo | Enterprise | Custom pricing, long sales cycle |
| **Sprout Social** | $249/user/mo | Agencies, Enterprise | Per-user pricing (expensive for teams) |
| **Hootsuite Insights** | $739+/mo | Enterprise | Social listening add-on ($999/mo extra) |
| **Brand24** | $99-399/mo | SMB | Limited platforms, lower accuracy |
| **Mention** | $41-833/mo | SMB to Mid-Market | Alerts focus, limited analytics |

**Competitor Weaknesses:**
- **Enterprise-focused pricing** (excludes 99% of businesses)
- **Per-user models** (expensive for teams > 3 people)
- **Limited Reddit/HN coverage** (they ignore valuable data sources)
- **Dashboard-first, not API-first** (developers can't integrate)
- **Batch processing** (hourly/daily updates, not real-time)

---

### 5.2 Our API Cost Structure

#### Data Acquisition Costs (per month):

| Platform | Cost | Coverage |
|----------|------|----------|
| Twitter API (Basic) | $100 | 10,000 tweets/mo |
| Reddit API | $0 | Unlimited (100 req/min) |
| YouTube API | $0 | 10,000 units/day (3M/mo) |
| Instagram Graph API | $0 | Customer's own accounts |
| Facebook Graph API | $0 | Customer's own accounts |
| Hacker News API | $0 | Unlimited |
| Product Hunt (scraping) | $50 | Daily launches |
| **Total Base Cost** | **$150/mo** | **Multi-platform coverage** |

#### Sentiment Analysis Costs:

| Solution | Cost | Processing Volume |
|----------|------|-------------------|
| VADER + TextBlob (Free) | $0 | Unlimited |
| Aylien API (Low-tier) | $49/mo | 50,000 calls |
| Aylien API (Mid-tier) | $99/mo | 100,000 calls |
| OpenAI GPT-4 (Premium) | $1,000/mo | ~100k posts (high-quality) |

#### Infrastructure Costs (Cloudflare):

| Service | Cost | Usage |
|---------|------|-------|
| Cloudflare Workers | $5/mo | 10M requests |
| R2 Storage | $0.015/GB | 1TB = $15/mo |
| D1 Database | $0-5/mo | 1B rows read = $1 |
| Queues | $0.40/mo | 1M operations = $0.40 |
| **Total Infrastructure** | **$20-50/mo** | **Production-scale** |

#### Total Cost of Goods Sold (COGS):

**Starter Plan ($49/mo):**
- Twitter: $10/mo (1,000 tweets allocation)
- Reddit: $0
- YouTube: $0
- HN/PH: $5/mo
- Sentiment: $0 (VADER/TextBlob)
- Infrastructure: $10/mo
- **Total COGS: $25/mo**
- **Gross Margin: 49%** ($24 profit)

**Growth Plan ($199/mo):**
- Twitter: $50/mo (5,000 tweets allocation)
- Reddit: $0
- YouTube: $0
- HN/PH: $10/mo
- Sentiment: $25/mo (Aylien partial)
- Infrastructure: $20/mo
- **Total COGS: $105/mo**
- **Gross Margin: 47%** ($94 profit)

**Pro Plan ($499/mo):**
- Twitter: $100/mo (10,000 tweets allocation)
- Reddit: $0
- YouTube: $0
- HN/PH: $20/mo
- Sentiment: $50/mo (Aylien full)
- Infrastructure: $50/mo
- **Total COGS: $220/mo**
- **Gross Margin: 56%** ($279 profit)

---

### 5.3 Pricing Strategy

#### Target Plans:

| Plan | Price | Keywords | Mentions/Mo | Platforms | Sentiment | Support |
|------|-------|----------|-------------|-----------|-----------|---------|
| **Starter** | $49/mo | 3 | 5,000 | Reddit, YT, HN | Basic (VADER) | Email |
| **Growth** | $99/mo | 10 | 20,000 | + Twitter (1k) | Standard (Aylien) | Email + Chat |
| **Pro** | $199/mo | 25 | 50,000 | + Twitter (5k) | Advanced | Priority |
| **Business** | $499/mo | 100 | 200,000 | + Twitter (10k), All | Premium (AI) | Dedicated |
| **Enterprise** | Custom | Unlimited | Unlimited | All + Custom | Custom | White-glove |

#### Value Proposition:

**vs Brandwatch ($800-3,000/mo):**
- We're **6-20x cheaper** ($199 vs $800-3,000)
- **Better Reddit/HN coverage** (they ignore these platforms)
- **API-first** (they're dashboard-only)
- **Real-time** (they batch process)

**vs Sprout Social ($249/user/mo):**
- We're **per-company, not per-user** (save $500-2,000/mo for 3+ person teams)
- **Comparable features** at 1/2 to 1/10 the price
- **No hidden fees** (their social listening is $999/mo extra)

**vs Hootsuite Insights ($739+/mo):**
- We're **4-7x cheaper** ($199 vs $739+)
- **Better platform coverage**
- **Faster updates** (real-time vs daily)

---

## 6. Data Collection Methods

### 6.1 Real-Time Streaming

**Best For:** Twitter, Reddit (via WebSocket)

**Architecture:**
- Maintain persistent WebSocket connection
- Stream mentions as they happen
- Process in real-time (Workers + Queues)
- Store in D1 + R2 (hot + cold storage)

**Advantages:**
- Lowest latency (< 5 seconds from post to alert)
- Catch trending topics early
- Enable real-time alerts (Slack, email, webhook)

**Disadvantages:**
- More complex infrastructure (maintain connections)
- Higher Workers compute costs (always-on processing)
- Twitter requires Pro tier ($5,000/mo) for streaming API

**Recommendation:** Use for premium customers ($499+/mo) who need real-time alerts

---

### 6.2 Polling APIs

**Best For:** YouTube, Instagram, Hacker News, Product Hunt

**Architecture:**
- Poll API every 5-15 minutes (scheduled Cron)
- Fetch new posts since last poll
- Batch process and store

**Advantages:**
- Simple implementation
- Lower infrastructure costs (Cron Workers = $5/mo)
- Sufficient for most use cases (15-min latency acceptable)

**Disadvantages:**
- Higher API call volume (fetch even if no new data)
- 15-minute latency (miss rapid-fire conversations)

**Recommendation:** Default method for starter/growth plans ($49-199/mo)

---

### 6.3 Historical Backfill

**Best For:** Onboarding new customers, trend analysis

**Data Sources:**
- Reddit: Pushshift archives (community-maintained)
- Twitter: Historical search API (Pro tier, 30 days)
- YouTube: API allows historical search (quota-limited)

**Architecture:**
- Run one-time backfill job on customer signup
- Fetch past 30-90 days of mentions
- Batch process and store
- Enable "historical trends" feature

**Advantages:**
- Show customer their brand's history immediately
- Enable trend charts on day 1
- Competitive intel from before customer signed up

**Disadvantages:**
- High initial API quota usage
- Slow onboarding (may take hours to backfill)
- Twitter historical search requires Pro tier ($5k/mo)

**Recommendation:** Offer as "premium onboarding" for Business/Enterprise plans

---

### 6.4 Webhook Integrations

**Best For:** Instagram, Facebook (for owned accounts)

**Architecture:**
- Register webhooks with platform (Meta)
- Receive push notifications on new mentions/comments
- Process immediately via Workers

**Advantages:**
- Real-time for owned accounts
- Zero polling (platform pushes to us)
- Low latency (< 5 seconds)

**Disadvantages:**
- Only works for accounts customer owns
- Cannot monitor competitors
- Requires platform approval (Facebook App Review)

**Recommendation:** Offer for social media management features (not competitive intel)

---

### 6.5 Web Scraping

**Best For:** TikTok, Product Hunt, LinkedIn (public data)

**Legal Considerations:**
- **Legal precedent:** hiQ vs. LinkedIn (2022) ruled public data scraping is legal
- **Must respect:** robots.txt, rate limits, no login wall bypassing
- **Cannot:** Create accounts to access private data, violate ToS you agreed to

**Architecture:**
- Use headless browser (Playwright, Puppeteer)
- Rotate proxies (Bright Data, Oxylabs)
- Parse HTML/JSON responses
- Store in R2 + D1

**Advantages:**
- Access platforms without official APIs
- Flexible (can extract any public data)
- No API rate limits

**Disadvantages:**
- Fragile (breaks when platform changes HTML)
- Slower than APIs (HTTP parsing overhead)
- Legal gray area (platform ToS may prohibit, but not legally enforceable)
- Risk of IP bans (need proxy rotation)

**Recommendation:** Use selectively for high-value platforms (TikTok, Product Hunt) where API unavailable

---

## 7. Analytics & Reporting Features

### 7.1 Core Analytics

**Mention Volume Over Time:**
- Line chart showing daily/weekly/monthly mentions
- Compare to previous period (% change)
- Detect spikes (alert when > 2x baseline)

**Sentiment Distribution:**
- Pie chart: Positive / Neutral / Negative
- Track sentiment trend over time
- Compare your sentiment vs competitors

**Top Posts by Engagement:**
- Ranked list of most-liked/shared/commented posts
- Show reach/impressions (estimated)
- Identify viral content

**Top Hashtags:**
- Word cloud or frequency table
- Track hashtag growth over time
- Identify trending hashtags in your niche

**Influencer Leaderboard:**
- Rank influencers by reach, engagement, relevance
- Show authenticity score
- Contact info (if publicly available)

**Geographic Distribution:**
- Map showing mentions by country/city
- Table with top locations
- Detect regional trends

---

### 7.2 Competitive Intelligence Dashboards

**Share of Voice Chart:**
- Stacked bar chart: Your brand vs Competitors
- Track SOV change over time
- Platform-specific SOV breakdown

**Sentiment Comparison:**
- Side-by-side comparison: Your brand vs Competitors
- Identify sentiment leaders (who has best reputation)
- Alert when competitor sentiment spikes (crisis opportunity)

**Engagement Comparison:**
- Compare avg engagement per mention
- Identify engagement leaders (most passionate audiences)
- Benchmark against industry averages

**Topic Analysis:**
- What topics are associated with your brand vs competitors?
- Word cloud comparison
- Identify topic opportunities (what competitors own that you don't)

---

### 7.3 Alerting & Notifications

**Real-Time Alerts (Webhooks):**
- Send webhook to customer's Slack, Discord, or custom endpoint
- Trigger: New mention, sentiment spike, competitor mention, viral post

**Email Digests:**
- Daily/weekly summary: top mentions, sentiment, SOV
- Customizable (choose what to include)
- Beautiful HTML emails (branded)

**Custom Triggers:**
- Alert when mention volume > X% above baseline
- Alert when negative sentiment > X%
- Alert when competitor launches new product (detected via keywords)
- Alert when influencer (> 100k followers) mentions your brand

---

### 7.4 Reporting Exports

**PDF Reports:**
- Executive summary (1-page)
- Detailed analytics (charts, tables)
- Competitor comparison
- Recommendations (AI-generated insights)

**CSV/Excel Exports:**
- Raw data: all mentions, sentiment scores, engagement metrics
- Aggregated data: daily summaries, platform breakdowns
- Custom filters (date range, platform, sentiment)

**API Access:**
- RESTful API for programmatic access
- Webhooks for real-time data push
- GraphQL for flexible queries (advanced plans)

---

## 8. Competitive Advantages

### 8.1 Platform Coverage

**What Competitors Offer:**
- Brandwatch: Twitter, Facebook, Instagram, YouTube, blogs, news, forums (Reddit limited)
- Sprout Social: Twitter, Facebook, Instagram, LinkedIn, YouTube (no Reddit/HN)
- Hootsuite: Twitter, Facebook, Instagram, LinkedIn, YouTube, Pinterest (no Reddit/HN)

**What We Offer:**
- **Reddit** (FREE, unlimited monitoring - competitors charge $800+/mo)
- **Hacker News** (FREE, unlimited - NO competitors offer this)
- **Product Hunt** (FREE via scraping - NO competitors offer this)
- **YouTube** (FREE, 10k units/day - competitors offer but limited)
- **Twitter** (Paid, but transparent pricing - competitors hide costs)
- **Instagram/Facebook** (For owned accounts - same as competitors)

**Unique Value:**
- **Tech/Startup/B2B audiences** (Reddit, HN, PH) = 10M+ highly engaged users
- **Developer-friendly platforms** (HN especially) = hard to reach via paid ads
- **Long-form discussions** (Reddit threads) = richer sentiment data than Twitter

---

### 8.2 Speed & Latency

**Competitors:**
- Brandwatch: Hourly updates (dashboard refreshes every 1 hour)
- Sprout Social: Daily updates for most data (real-time only for owned accounts)
- Hootsuite: Real-time for owned accounts, hourly for listening

**Our Architecture:**
- **Real-time polling** (5-15 minute latency for all platforms)
- **Streaming** (< 5 seconds for Twitter, optional premium feature)
- **Instant alerts** (Webhook to Slack/email within seconds of detection)

**Advantage:**
- **Catch crises early** (respond within minutes, not hours)
- **Identify viral content** (engage while trending, not after it's over)
- **First-mover advantage** (respond to competitor launches immediately)

---

### 8.3 Pricing Strategy

**Competitors' Weaknesses:**
- Brandwatch: $800-3,000/mo (excludes 99% of businesses)
- Sprout Social: $249/user/mo (3 users = $747/mo + $999/mo for listening = $1,746/mo)
- Hootsuite: $739+/mo (enterprise-only pricing)

**Our Strategy:**
- **SMB-friendly:** $49-199/mo (10-20x cheaper)
- **Per-company pricing** (not per-user - save $1,000+/mo for teams)
- **Transparent pricing** (no "contact sales" - list prices publicly)
- **Free trial** (14-day, no credit card - let customers try before buying)

**Market Opportunity:**
- **99% of businesses** (< 50 employees) cannot afford $800-3,000/mo
- **Agencies** managing 10+ clients can't pay $249/user/mo (would cost $2,490/mo for 10 users)
- **Startups** need social listening but have < $200/mo budget

---

### 8.4 API-First Approach

**Competitors:**
- Dashboard-first (APIs are afterthought or not offered)
- APIs have limited functionality (can't replicate dashboard features)
- No webhooks (must poll for data)
- Rate limits on API access (even for paying customers)

**Our Approach:**
- **API-first design** (dashboard built on same API customers use)
- **Full feature parity** (everything in dashboard available via API)
- **Webhooks** (push data to customer's systems in real-time)
- **GraphQL** (flexible queries, fetch exactly what you need)
- **SDKs** (JavaScript, Python, Go, Ruby - easy integration)

**Target Customers:**
- Developers building custom tools
- Agencies white-labeling our data
- SaaS companies embedding social listening
- Data teams integrating with data warehouses (Snowflake, BigQuery)

---

### 8.5 Custom Alerts & Automation

**Competitors:**
- Basic alerts (email only, daily digest)
- No customization (can't define custom triggers)
- No automation (can't trigger actions based on alerts)

**Our Features:**
- **Custom triggers** (mention volume, sentiment, influencer threshold, keyword combos)
- **Multiple channels** (Email, Slack, Discord, Teams, webhook)
- **Alert frequency** (Instant, hourly, daily, weekly - customer chooses)
- **Automation hooks** (Trigger Zapier, Make.com, n8n workflows)
- **Action templates** (Auto-reply, escalate to team, create ticket)

**Use Cases:**
- Customer support: Auto-create Zendesk ticket on negative mention
- PR/Comms: Alert leadership on crisis (negative spike)
- Sales: Alert sales team when target account mentions competitor
- Product: Alert product team when feature request mentioned 10+ times

---

## 9. Privacy & Compliance Strategy

### 9.1 GDPR Compliance

**Key Requirements:**
- **Data minimization:** Only collect necessary data (don't store personal info unless required)
- **Purpose limitation:** Use data only for stated purpose (social listening)
- **Retention limits:** Don't store data longer than necessary (define retention policy)
- **Right to erasure:** Delete user data on request (within 30 days)
- **Data security:** Encrypt data at rest and in transit

**Our Approach:**
- **Anonymization:** Strip personally identifiable info (PII) from social posts where possible
  - Store only: username, post text, timestamp, engagement metrics
  - Do NOT store: email, phone, address, real name (unless public on profile)
- **Retention policy:**
  - Hot data: 90 days in D1 (queryable, real-time)
  - Warm data: 91-365 days in R2 (archived, slower queries)
  - Cold data: 366+ days deleted (unless customer requests longer retention)
- **Right to erasure:** Provide API endpoint for users to request deletion
  - Search our database for user's @username
  - Delete all mentions (or anonymize by removing username)
- **Consent:** Social posts are public data (no consent required for monitoring)
  - Exception: Private accounts, DMs, behind login walls (we don't monitor these)
- **Data processing agreement (DPA):** Offer to enterprise customers (required for GDPR)

---

### 9.2 CCPA Compliance (California Consumer Privacy Act)

**Key Requirements:**
- **Right to know:** Users can request what data we have about them
- **Right to delete:** Users can request deletion of their data
- **Opt-out of sale:** Users can opt-out of data selling (we don't sell data)

**Our Approach:**
- **Privacy policy:** Clearly state what data we collect and how we use it
- **User portal:** Allow users to submit requests (DSAR - Data Subject Access Request)
- **Automated processing:** Search database by username, email, or user ID
- **Response time:** 30 days to fulfill request (GDPR/CCPA requirement)

---

### 9.3 Platform Terms of Service Compliance

**Twitter/X ToS:**
- ✅ Use official API (don't scrape)
- ✅ Respect rate limits
- ✅ Don't store excessive historical data (> 30 days without Enterprise tier)
- ✅ Display "Tweet" attribution (show it came from Twitter)
- ⚠️ Cannot use data for ad targeting (we don't do this)

**Reddit ToS:**
- ✅ Use official API (don't scrape)
- ✅ Respect rate limits (100 req/min)
- ✅ Authenticate via OAuth
- ✅ Can store data indefinitely (no restrictions)
- ⚠️ Cannot impersonate users or manipulate votes

**YouTube ToS:**
- ✅ Use official API
- ✅ Respect quota limits (10k units/day)
- ✅ Display YouTube attribution (show it came from YouTube)
- ⚠️ Cannot download videos (we only fetch metadata)

**Instagram/Facebook ToS:**
- ✅ Use official Graph API
- ✅ Only access accounts we have permission for
- ⚠️ Cannot scrape public pages (against ToS)
- ⚠️ Cannot store data for > 24 hours (without explicit permission)

**Hacker News ToS:**
- ✅ Use official Firebase API
- ✅ No rate limits (generous)
- ✅ Can store data indefinitely
- ✅ Public domain content (no attribution required, but courteous)

**Product Hunt:**
- ⚠️ No official API (deprecated)
- ⚠️ Scraping may violate ToS (legal gray area)
- ✅ Public data (hiQ vs. LinkedIn precedent supports scraping)
- **Recommendation:** Scrape responsibly, respect robots.txt, don't overwhelm their servers

---

### 9.4 Data Retention Policy

**Hot Storage (D1 Database - Queryable):**
- **Duration:** 90 days
- **Purpose:** Real-time queries, dashboards, alerts
- **Cost:** ~$5-10/mo per 1M rows

**Warm Storage (R2 Object Storage - Archived):**
- **Duration:** 91-365 days
- **Purpose:** Historical analysis, trend reports
- **Cost:** $0.015/GB (~$1/mo for 1M posts)

**Cold Storage (Deletion):**
- **Duration:** 366+ days
- **Purpose:** Deleted (unless customer pays for extended retention)
- **Exception:** Aggregated data (anonymized) retained indefinitely for benchmarking

**Customer Options:**
- **Standard retention:** 90 days hot, 365 days total (included in all plans)
- **Extended retention:** 1 year hot, 3 years total (+$50/mo)
- **Unlimited retention:** Forever (+$200/mo, Enterprise only)

---

### 9.5 User Consent & Opt-Out

**Do We Need Consent?**
- **No** (for public social media posts)
  - Posts are publicly shared by users
  - No expectation of privacy
  - Legal to monitor (like reading a newspaper)
- **Yes** (for private/DM data)
  - We don't monitor private accounts, DMs, or behind-login content
  - Requires explicit user authorization (OAuth)

**Opt-Out Mechanism:**
- Provide web form: "Remove my data from [Brand Name] monitoring"
- User enters their @username or email
- We search our database and anonymize/delete their posts
- Confirmation email sent within 24 hours

**Transparency:**
- List on website: "We monitor public social media data"
- Link to privacy policy (explain what we collect, why, how long)
- Provide contact email: privacy@ourcompany.com

---

## 10. Technical Architecture

### 10.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Data Collection Layer                    │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐│
│  │Twitter │  │ Reddit │  │YouTube │  │ HN/PH  │  │Instagram││
│  │  API   │  │  API   │  │  API   │  │  API   │  │   API   ││
│  └────┬───┘  └────┬───┘  └────┬───┘  └────┬───┘  └────┬───┘│
│       │           │           │           │           │     │
│       └───────────┴───────────┴───────────┴───────────┘     │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             ▼
              ┌──────────────────────────────┐
              │   Cloudflare Workers Cron    │
              │  (Poll APIs every 5-15 min)  │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │    Processing Pipeline       │
              │  • Deduplication             │
              │  • Sentiment Analysis        │
              │  • Entity Extraction         │
              │  • Enrichment                │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │   Cloudflare Queue           │
              │  (Buffer for batch writes)   │
              └──────────────┬───────────────┘
                             ▼
      ┌──────────────────────┴───────────────────────┐
      ▼                                               ▼
┌─────────────┐                               ┌──────────────┐
│ D1 Database │                               │  R2 Storage  │
│  (Hot Data) │                               │ (Cold Data)  │
│   90 days   │                               │  365+ days   │
└──────┬──────┘                               └──────┬───────┘
       │                                             │
       └─────────────────┬───────────────────────────┘
                         ▼
              ┌──────────────────────────────┐
              │      API Gateway             │
              │  • REST API                  │
              │  • GraphQL                   │
              │  • Webhooks                  │
              └──────────────┬───────────────┘
                             ▼
      ┌──────────────────────┴───────────────────────┐
      ▼                      ▼                        ▼
┌───────────┐        ┌──────────────┐        ┌──────────────┐
│ Dashboard │        │ Mobile Apps  │        │ Third-Party  │
│ (Next.js) │        │ (React Native│        │ Integrations │
└───────────┘        └──────────────┘        └──────────────┘
```

---

### 10.2 Data Collection Architecture

**Cron Workers (Scheduled Tasks):**
```javascript
// Example: Poll Reddit API every 5 minutes
export default {
  async scheduled(event, env, ctx) {
    // 1. Fetch customer keywords from D1
    const keywords = await env.DB.prepare(
      'SELECT keyword FROM keywords WHERE active = 1'
    ).all()

    // 2. Query Reddit API for each keyword
    for (const { keyword } of keywords.results) {
      const mentions = await fetchRedditMentions(keyword)

      // 3. Send to Queue for processing
      for (const mention of mentions) {
        await env.QUEUE.send(mention)
      }
    }
  }
}
```

**Queue Consumer (Process in batches):**
```javascript
export default {
  async queue(batch, env) {
    // 1. Deduplicate mentions
    const unique = deduplicateMentions(batch.messages)

    // 2. Analyze sentiment
    for (const msg of unique) {
      msg.sentiment = await analyzeSentiment(msg.text, env)
    }

    // 3. Extract entities (brands, people, topics)
    const entities = await extractEntities(unique)

    // 4. Batch write to D1
    await env.DB.batch(
      unique.map(m =>
        env.DB.prepare('INSERT INTO mentions (text, sentiment, ...) VALUES (?, ?, ...)')
          .bind(m.text, m.sentiment, ...)
      )
    )

    // 5. Check alert triggers
    await checkAlerts(unique, env)
  }
}
```

---

### 10.3 Database Schema (D1)

**`mentions` table:**
```sql
CREATE TABLE mentions (
  id TEXT PRIMARY KEY,  -- UUID
  customer_id TEXT NOT NULL,
  platform TEXT NOT NULL,  -- twitter, reddit, youtube, etc.
  post_id TEXT NOT NULL,  -- Platform's unique ID
  author_username TEXT,
  author_followers INTEGER,
  text TEXT NOT NULL,
  sentiment_score REAL,  -- -1 to 1
  sentiment_label TEXT,  -- positive, neutral, negative
  engagement_count INTEGER,  -- likes + comments + shares
  reach_estimate INTEGER,  -- Estimated reach
  url TEXT,
  posted_at INTEGER NOT NULL,  -- Unix timestamp
  collected_at INTEGER NOT NULL,
  metadata TEXT,  -- JSON (platform-specific data)

  UNIQUE(platform, post_id)  -- Prevent duplicates
);

CREATE INDEX idx_customer_posted ON mentions(customer_id, posted_at DESC);
CREATE INDEX idx_sentiment ON mentions(customer_id, sentiment_label, posted_at DESC);
CREATE INDEX idx_platform ON mentions(customer_id, platform, posted_at DESC);
```

**`keywords` table:**
```sql
CREATE TABLE keywords (
  id INTEGER PRIMARY KEY,
  customer_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  active INTEGER DEFAULT 1,  -- Boolean: 1 = active, 0 = paused
  created_at INTEGER NOT NULL,

  UNIQUE(customer_id, keyword)
);

CREATE INDEX idx_active_keywords ON keywords(active, customer_id);
```

**`alerts` table:**
```sql
CREATE TABLE alerts (
  id INTEGER PRIMARY KEY,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,  -- volume_spike, sentiment_negative, keyword_match
  trigger_value TEXT,  -- JSON config
  channel TEXT NOT NULL,  -- email, slack, webhook
  channel_config TEXT,  -- JSON (webhook URL, Slack channel, etc.)
  active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);
```

---

### 10.4 Storage Strategy (R2)

**Hot Data (D1):**
- Last 90 days of mentions
- Queryable via SQL
- Fast aggregations (count, avg sentiment, etc.)

**Cold Data (R2):**
- 91-365 days of mentions
- Stored as JSON files (batched by day)
- Path structure: `{customer_id}/{year}/{month}/{day}.json`
- Lazy-load for historical reports (slower, but cheaper)

**Archival Process (Daily Cron):**
```javascript
export default {
  async scheduled(event, env, ctx) {
    // 1. Fetch mentions older than 90 days
    const oldMentions = await env.DB.prepare(
      'SELECT * FROM mentions WHERE posted_at < ?'
    ).bind(Date.now() - 90 * 24 * 60 * 60 * 1000).all()

    // 2. Group by customer + date
    const grouped = groupByCustomerAndDate(oldMentions.results)

    // 3. Write to R2
    for (const [key, mentions] of Object.entries(grouped)) {
      await env.R2.put(key, JSON.stringify(mentions))
    }

    // 4. Delete from D1
    await env.DB.prepare(
      'DELETE FROM mentions WHERE posted_at < ?'
    ).bind(Date.now() - 90 * 24 * 60 * 60 * 1000).run()
  }
}
```

---

### 10.5 API Design

**REST API (Primary):**
```
GET /api/v1/mentions
  ?customer_id=<id>
  &platform=twitter,reddit
  &from=2025-09-01
  &to=2025-10-01
  &sentiment=negative
  &limit=100
  &offset=0

Response:
{
  "data": [
    {
      "id": "uuid",
      "platform": "reddit",
      "author": "user123",
      "text": "I love this product!",
      "sentiment": { "score": 0.85, "label": "positive" },
      "engagement": 42,
      "url": "https://reddit.com/r/...",
      "posted_at": "2025-10-01T12:34:56Z"
    },
    ...
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 1234
  }
}
```

**GraphQL API (Advanced):**
```graphql
query GetMentions($customerId: ID!, $filters: MentionFilters) {
  mentions(customerId: $customerId, filters: $filters) {
    edges {
      node {
        id
        platform
        author {
          username
          followers
        }
        text
        sentiment {
          score
          label
        }
        engagement {
          likes
          comments
          shares
          total
        }
        url
        postedAt
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    aggregations {
      totalCount
      avgSentiment
      platformBreakdown {
        platform
        count
      }
    }
  }
}
```

**Webhook Events:**
```json
POST <customer_webhook_url>
{
  "event": "mention.created",
  "data": {
    "id": "uuid",
    "platform": "twitter",
    "author": "@user123",
    "text": "Just tried @YourBrand and it's amazing!",
    "sentiment": { "score": 0.9, "label": "positive" },
    "engagement": 156,
    "url": "https://twitter.com/...",
    "posted_at": "2025-10-01T12:34:56Z"
  },
  "triggered_by": {
    "alert_id": 123,
    "alert_name": "Positive Mentions"
  }
}
```

---

## 11. Implementation Roadmap

### Phase 1: MVP (Months 1-2)

**Goal:** Launch with Reddit + Hacker News monitoring (both FREE APIs)

**Features:**
- Keyword monitoring (5 keywords per customer)
- Basic sentiment analysis (VADER)
- Simple dashboard (Next.js + shadcn/ui)
- Email alerts (daily digest)
- REST API (basic endpoints)

**Tech Stack:**
- Cloudflare Workers (Cron + Queue)
- D1 Database (mentions, customers, keywords)
- R2 Storage (cold data after 90 days)
- Next.js Dashboard (hosted on Cloudflare Pages)

**Pricing:**
- Single plan: $49/mo (5 keywords, Reddit + HN)

**Target Customers:**
- Indie hackers, bootstrapped startups
- Product Hunt launchers (need HN/Reddit monitoring)
- Developer tool companies (reach technical audiences)

**Launch Strategy:**
- Post on Hacker News ("Show HN: Affordable social listening for Reddit/HN")
- Post on Product Hunt
- Reddit ads targeting /r/startups, /r/entrepreneur

---

### Phase 2: Twitter Integration (Month 3)

**Goal:** Add Twitter API Basic tier ($100/mo)

**Features:**
- Twitter keyword monitoring (1,000-10,000 tweets/mo depending on plan)
- Real-time Twitter alerts (5-15 min latency)
- Influencer identification (follower count, engagement rate)
- Competitive SOV tracking (Twitter only)

**Pricing:**
- Starter: $49/mo (5 keywords, Reddit + HN only)
- Growth: $99/mo (10 keywords, + 1,000 tweets/mo)
- Pro: $199/mo (25 keywords, + 5,000 tweets/mo)

**Target Customers:**
- B2C brands (need Twitter monitoring)
- PR/comms teams (crisis detection)
- Agencies (manage multiple clients)

---

### Phase 3: YouTube + Advanced Sentiment (Month 4)

**Goal:** Add YouTube API (FREE, 10k units/day) + Aylien sentiment

**Features:**
- YouTube video/comment monitoring
- Multi-language sentiment (Aylien API)
- Improved accuracy (70-80% vs 63% VADER-only)
- Historical trend charts (90-day data)

**Pricing:**
- Add-on: YouTube monitoring ($20/mo extra)
- Standard sentiment: Included (VADER)
- Advanced sentiment: +$30/mo (Aylien, multi-language)

---

### Phase 4: Instagram/Facebook + Influencer Tools (Month 5-6)

**Goal:** Social media management features (own accounts)

**Features:**
- Instagram/Facebook analytics (owned accounts only)
- Content scheduling (post to Twitter, Reddit, HN)
- Influencer database (search 1M+ influencers)
- Authenticity scoring (fake follower detection)

**Pricing:**
- Social Management Add-on: +$50/mo
- Influencer Database: +$100/mo (Pro plan and up)

---

### Phase 5: TikTok + Product Hunt + LinkedIn (Months 7-9)

**Goal:** Complete platform coverage

**Features:**
- TikTok monitoring (scraping + unofficial API)
- Product Hunt launch tracking
- LinkedIn scraping (public data only)
- Cross-platform SOV analysis

**Pricing:**
- Business plan: $499/mo (all platforms, 100 keywords)
- Enterprise: Custom (white-glove, unlimited)

---

### Phase 6: Advanced Features (Months 10-12)

**Goal:** Premium analytics and automation

**Features:**
- AI-powered insights (GPT-4 summary reports)
- Automated responses (reply to mentions via API)
- CRM integrations (Salesforce, HubSpot, Zendesk)
- Data warehouse exports (Snowflake, BigQuery)
- White-label dashboard (agencies)

**Pricing:**
- Premium insights: +$200/mo (GPT-4 reports)
- API automation: +$100/mo (auto-reply, CRM sync)
- White-label: +$500/mo (agencies only)

---

## 12. Go-to-Market Strategy

### 12.1 Target Customer Segments

**Segment 1: Indie Hackers & Bootstrapped Startups ($49-99/mo)**
- Pain: Can't afford Brandwatch ($800/mo)
- Need: Reddit/HN monitoring (where their audience hangs out)
- Channels: Product Hunt, Hacker News, Indie Hackers community
- Messaging: "Social listening for startups that can't afford enterprise tools"

**Segment 2: Small B2B SaaS Companies ($99-199/mo)**
- Pain: Twitter is expensive, need multi-platform monitoring
- Need: Competitor tracking, product feedback, crisis detection
- Channels: Twitter ads, LinkedIn ads, SaaS review sites (G2, Capterra)
- Messaging: "Know what customers say about you and your competitors—before they switch"

**Segment 3: Agencies Managing 5-20 Clients ($199-499/mo)**
- Pain: Sprout Social costs $249/user (= $747/mo for 3 users + $999/mo listening = $1,746/mo)
- Need: Multi-client dashboard, white-label reports, API access
- Channels: Agency communities, LinkedIn, referrals
- Messaging: "Save $1,500/mo vs Sprout Social—same features, 1/10th the price"

**Segment 4: Mid-Market Brands ($499-999/mo)**
- Pain: Hootsuite/Brandwatch are too expensive ($739-3,000/mo)
- Need: Real-time monitoring, influencer tracking, executive reports
- Channels: Outbound sales, LinkedIn, industry events
- Messaging: "Enterprise-grade social listening at SMB pricing"

**Segment 5: Developers/Data Teams (Custom/Enterprise)**
- Pain: Need raw data for ML models, BI dashboards, custom apps
- Need: API-first, bulk exports, webhook integrations
- Channels: Dev communities (HN, Reddit r/datascience), API marketplaces (RapidAPI)
- Messaging: "API-first social listening—integrate social data into your stack"

---

### 12.2 Marketing Channels

**Organic (Months 1-3):**
- Product Hunt launch (aim for #1 Product of the Day)
- Hacker News "Show HN" post (engage in comments, don't spam)
- Reddit posts in /r/startups, /r/entrepreneur, /r/SaaS (value-add, not ads)
- Content marketing (blog: "How to monitor Reddit for free", "Twitter API alternatives")
- SEO (target: "Brandwatch alternative", "cheap social listening", "Reddit monitoring tool")

**Paid (Months 4-6):**
- Twitter ads (target: "social media manager", "PR manager", "marketing director")
- LinkedIn ads (target: agencies, SaaS CMOs, PR directors)
- Reddit ads (target: /r/startups, /r/smallbusiness, /r/marketing)
- Google Search ads (target: "Brandwatch alternative", "social listening tool")

**Partnerships (Months 6-12):**
- Affiliate program (20% commission for agencies, influencers)
- Integration partners (Zapier, Make.com, Slack, HubSpot)
- SaaS review sites (G2, Capterra, TrustRadius - solicit reviews)
- Reseller partnerships (agencies white-label our tool)

---

### 12.3 Pricing Page Copy (Example)

**Headline:** Stop Overpaying for Social Listening

**Subheadline:** Monitor Reddit, Twitter, YouTube, and Hacker News for 10x less than Brandwatch. API-first. Real-time. No per-user fees.

**Plans:**

**Starter - $49/mo**
- 3 keywords
- Reddit + Hacker News + YouTube (unlimited)
- Basic sentiment (VADER)
- 5,000 mentions/month stored
- Email alerts (daily digest)
- 14-day free trial

**Growth - $99/mo** (Most Popular)
- 10 keywords
- + Twitter (1,000 tweets/month)
- Standard sentiment (Aylien, 70-80% accuracy)
- 20,000 mentions/month stored
- Email + Slack alerts
- API access (10k requests/month)

**Pro - $199/mo**
- 25 keywords
- + Twitter (5,000 tweets/month)
- + Product Hunt monitoring
- Advanced sentiment (multi-language)
- 50,000 mentions/month stored
- Webhook alerts (real-time)
- API access (100k requests/month)

**Business - $499/mo**
- 100 keywords
- + Twitter (10,000 tweets/month)
- + TikTok monitoring (beta)
- Premium sentiment (GPT-4 insights)
- 200,000 mentions/month stored
- Custom alerts + automations
- API access (unlimited)
- White-label reports

**Enterprise - Custom**
- Unlimited keywords
- All platforms (including LinkedIn scraping)
- Dedicated infrastructure (single-tenant)
- Custom retention (1-3 years)
- SSO, SLA, dedicated support
- White-glove onboarding

---

## 13. Success Metrics & KPIs

### 13.1 Product Metrics

**User Acquisition:**
- Target: 100 signups/month (Months 1-3)
- Target: 500 signups/month (Months 6-9)
- Target: 2,000 signups/month (Month 12)

**Activation Rate:**
- Target: 60% of signups add ≥1 keyword within 24 hours
- Target: 40% of signups receive ≥1 mention within 7 days

**Retention:**
- Target: 50% of trial users convert to paid (Month 1)
- Target: 70% of trial users convert to paid (Month 6+)
- Target: 90% monthly retention (paid customers)

**Revenue:**
- Target: $5k MRR (Month 3) @ 100 customers
- Target: $50k MRR (Month 9) @ 500 customers
- Target: $200k MRR (Month 18) @ 2,000 customers

---

### 13.2 Technical Metrics

**API Reliability:**
- Target: 99.9% uptime (< 45 min downtime/month)
- Target: p95 latency < 200ms (API responses)
- Target: 0 data loss (all mentions captured and stored)

**Data Freshness:**
- Target: < 15 min latency (polling-based platforms)
- Target: < 5 sec latency (streaming-based platforms)
- Target: 100% of keywords polled every 5-15 min

**Infrastructure Costs:**
- Target: < 40% COGS (maintain 60%+ gross margin)
- Target: < $100/mo infrastructure per 1,000 customers

---

### 13.3 Customer Success Metrics

**Support Volume:**
- Target: < 5% of customers contact support monthly
- Target: 95% of tickets resolved within 24 hours
- Target: CSAT score > 4.5/5

**Feature Adoption:**
- Target: 80% of customers use alerts
- Target: 60% of customers use API
- Target: 40% of customers use influencer tools

---

## 14. Competitive Intelligence Summary

### 14.1 Competitor Weaknesses We Exploit

**Brandwatch:**
- ❌ $800-3,000/mo (too expensive for SMBs)
- ❌ Enterprise-only (long sales cycles, no self-serve)
- ❌ Poor Reddit/HN coverage (we excel here)
- ❌ No API-first approach (dashboard-only)

**Sprout Social:**
- ❌ $249/user/mo (team = $1,000+/mo)
- ❌ Social listening is $999/mo extra (total = $1,746/mo for 3 users)
- ❌ No Hacker News monitoring (we offer it)
- ❌ Dashboard-first, limited API

**Hootsuite Insights:**
- ❌ $739+/mo (expensive)
- ❌ Social listening is add-on (base price + $999/mo)
- ❌ Batch processing (hourly updates, not real-time)
- ❌ No Reddit/HN coverage

**Brand24:**
- ✅ Affordable ($99-399/mo) (our closest competitor)
- ❌ Lower accuracy sentiment (vs our Aylien tier)
- ❌ Limited API (no GraphQL, basic webhooks)
- ❌ No Hacker News monitoring (we offer it)

---

### 14.2 Our Competitive Moats

1. **Reddit + Hacker News Coverage** (FREE, unlimited, no competitors offer this)
2. **SMB-Friendly Pricing** ($49-199/mo vs $800-3,000/mo)
3. **API-First Architecture** (developers love us, competitors ignore them)
4. **Real-Time Updates** (5-15 min vs 1+ hour for competitors)
5. **Transparent Pricing** (list prices publicly, no "contact sales")
6. **Cloudflare Infrastructure** (near-zero egress fees, 60%+ margins)

---

## 15. Risk Analysis & Mitigation

### 15.1 Platform API Risks

**Risk:** Twitter increases API pricing (has happened multiple times)

**Mitigation:**
- Diversify: Offer Twitter as optional add-on (not core feature)
- Pass costs through: If Twitter raises prices, increase our Twitter plans proportionally
- Alternatives: Explore Twitter scraping (legal for public data) as backup

**Risk:** Reddit restricts API access (like they did in 2023)

**Mitigation:**
- Stockpile historical data (Pushshift archives)
- Use multiple API keys (distribute load)
- Build relationships with Reddit (apply for official partnership)

**Risk:** Platform shuts down API entirely (like Product Hunt did)

**Mitigation:**
- Accept the risk (scraping is always an option for public data)
- Focus on platforms with stable APIs (Reddit, YouTube, Hacker News)
- Diversify across 5+ platforms (not dependent on any single one)

---

### 15.2 Legal Risks

**Risk:** Platform sues us for ToS violation (scraping, data storage)

**Mitigation:**
- Only scrape public data (hiQ vs. LinkedIn precedent supports us)
- Respect robots.txt, rate limits, no login bypass
- Hire legal counsel (review ToS compliance before launch)
- Offer to remove data on platform request (good-faith cooperation)

**Risk:** GDPR/CCPA fines (improper data handling)

**Mitigation:**
- Implement GDPR-compliant processes (anonymization, retention limits, right to erasure)
- Offer DPA (Data Processing Agreement) to enterprise customers
- Regular audits (quarterly GDPR compliance checks)
- Cyber insurance (covers GDPR fines up to $1M)

---

### 15.3 Competitive Risks

**Risk:** Incumbent (Brandwatch, Sprout) drops prices to $199/mo

**Mitigation:**
- Unlikely (they're enterprise-focused, can't profitably serve SMBs)
- If they do: compete on features (Reddit/HN, API-first, real-time)
- Build moat via customer lock-in (integrations, historical data, workflows)

**Risk:** New competitor launches with similar pricing

**Mitigation:**
- First-mover advantage (launch before copycats)
- Build brand (become "the" affordable social listening tool)
- Network effects (more customers = more data for benchmarking)
- Raise funding (out-market competitors with VC money)

---

## 16. Conclusion & Recommendations

### 16.1 Market Opportunity

**Validated Demand:**
- Social listening market: $3.5B+ in 2025 (growing 15% YoY)
- Influencer marketing: $24B+ in 2025 (social listening is subset)
- 99% of businesses (< 50 employees) cannot afford enterprise tools ($800-3,000/mo)
- Developers/data teams underserved (no API-first social listening platforms)

**Whitespace Opportunity:**
- Reddit monitoring: 50M+ daily active users, FREE API, zero competitors
- Hacker News monitoring: 5M+ tech audience, FREE API, zero competitors
- SMB segment: $49-199/mo price point = 10M+ potential customers (vs 10k at $800+/mo)

---

### 16.2 Technical Feasibility

**Infrastructure Costs:**
- COGS: $25-220/mo per customer (depending on plan)
- Gross margin: 47-56% (sustainable at scale)
- Break-even: ~500 customers @ $99/mo avg = $50k MRR = profitable

**Data Availability:**
- Reddit: FREE, unlimited (100 req/min)
- YouTube: FREE, 10k units/day (sufficient for 1,000+ customers)
- Hacker News: FREE, unlimited
- Twitter: $100/mo (10k tweets) = affordable at $99+/mo pricing
- Sentiment: VADER/TextBlob FREE (70% accuracy) or Aylien $49-99/mo (80% accuracy)

**Development Timeline:**
- MVP (Reddit + HN): 2 months
- Twitter integration: 1 month
- YouTube integration: 2 weeks
- Dashboard + API: 1 month
- **Total to launch: 4-5 months**

---

### 16.3 Strategic Recommendations

**Phase 1 (Launch):**
1. Start with Reddit + Hacker News only (both FREE, zero COGS)
2. Price at $49/mo (5 keywords, unlimited mentions)
3. Target indie hackers, bootstrapped startups (Product Hunt, HN launch)
4. Goal: 100 customers @ $49/mo = $5k MRR (Month 3)

**Phase 2 (Growth):**
1. Add Twitter API Basic tier (1,000-10,000 tweets/mo)
2. Introduce Growth ($99/mo) and Pro ($199/mo) plans
3. Target B2B SaaS, agencies, small brands
4. Goal: 500 customers @ $99/mo avg = $50k MRR (Month 9)

**Phase 3 (Scale):**
1. Add YouTube, TikTok, Product Hunt monitoring
2. Build influencer database and authenticity scoring
3. Launch Business ($499/mo) and Enterprise (custom) plans
4. Target mid-market brands, large agencies
5. Goal: 2,000 customers @ $150/mo avg = $300k MRR (Month 18)

**Phase 4 (Expand):**
1. White-label offering for agencies ($500-1,000/mo reseller pricing)
2. API marketplace (RapidAPI, sell API access standalone)
3. Data partnerships (sell aggregated insights to researchers, VCs)
4. International expansion (multi-language sentiment, regional platforms)

---

### 16.4 Why This Will Succeed

**Unfair Advantages:**
1. **Cost Structure:** Cloudflare Workers + FREE APIs = 60%+ margins (competitors have 30-40%)
2. **Reddit/HN Monopoly:** Only social listening tool monitoring these platforms = 50M+ addressable users
3. **API-First:** Developers/data teams have zero alternatives (Brandwatch is dashboard-only)
4. **SMB Focus:** $49-199/mo is magical price point (affordable for 10M+ businesses vs 10k at $800+/mo)
5. **Real-Time:** 5-15 min latency vs 1+ hour for competitors (catch crises early)

**Proof of Demand:**
- Brand24 (our closest competitor) has 5,000+ customers at $99-399/mo (= $6M+ ARR)
- They don't monitor Reddit/HN, have inferior API, charge more
- If we capture even 10% of their market ($600k ARR), we're profitable

**Total Addressable Market (TAM):**
- 32M+ small businesses in US alone
- 10M+ use social media for marketing
- 1M+ would pay $49-199/mo for social listening (if aware and affordable)
- If we capture 0.1% (10k customers @ $99/mo avg) = **$12M ARR**

---

### 16.5 Next Steps

**Immediate Actions (Week 1):**
1. Register domain, set up Cloudflare account
2. Apply for Twitter Developer account (Basic tier)
3. Create Reddit API application (OAuth client)
4. Set up initial infrastructure (Workers, D1, R2)
5. Build MVP data collection pipeline (Reddit polling)

**Month 1:**
1. Build Reddit + Hacker News monitoring pipeline
2. Implement VADER sentiment analysis
3. Create basic D1 schema (mentions, customers, keywords)
4. Build simple dashboard (Next.js + shadcn/ui)
5. Test with 5-10 beta customers

**Month 2:**
1. Add email alerts (daily digest)
2. Build REST API (basic endpoints)
3. Implement billing (Stripe subscriptions)
4. Create landing page + pricing page
5. Launch on Product Hunt + Hacker News

**Month 3-4:**
1. Gather user feedback, iterate on MVP
2. Add Twitter API integration
3. Introduce Growth ($99/mo) and Pro ($199/mo) plans
4. Start paid marketing (Twitter ads, Google Search ads)
5. Goal: 100 paying customers by end of Month 4

---

### 16.6 Success Criteria (6-Month Check-in)

**Must-Have Metrics:**
- ✅ 200+ paying customers
- ✅ $20k+ MRR
- ✅ 60%+ trial-to-paid conversion
- ✅ 85%+ monthly retention
- ✅ < 50% COGS (maintain profitability)
- ✅ 4.5+ CSAT score (customer satisfaction)

**Nice-to-Have Metrics:**
- 500+ paying customers ($50k MRR)
- 10+ enterprise customers ($499+/mo)
- 5+ agency reseller partnerships
- Featured on Product Hunt, HackerNoon, TechCrunch

---

## 17. Appendix: Resources & Links

### 17.1 API Documentation

- **Twitter API v2:** https://developer.twitter.com/en/docs/twitter-api
- **Reddit API:** https://www.reddit.com/dev/api/
- **YouTube Data API v3:** https://developers.google.com/youtube/v3
- **Instagram Graph API:** https://developers.facebook.com/docs/instagram-api
- **Facebook Graph API:** https://developers.facebook.com/docs/graph-api
- **Hacker News API:** https://github.com/HackerNews/API

### 17.2 Sentiment Analysis Libraries

- **VADER:** https://github.com/cjhutto/vaderSentiment
- **TextBlob:** https://textblob.readthedocs.io/
- **Aylien API:** https://aylien.com/text-api/
- **MonkeyLearn:** https://monkeylearn.com/

### 17.3 Open-Source Tools

- **PRAW (Python Reddit API Wrapper):** https://praw.readthedocs.io/
- **Tweepy (Python Twitter API):** https://www.tweepy.org/
- **Social-Searcher:** https://www.social-searcher.com/ (competitor, for research)
- **Pushshift (Reddit archives):** https://pushshift.io/

### 17.4 Cloudflare Documentation

- **Workers:** https://developers.cloudflare.com/workers/
- **D1 Database:** https://developers.cloudflare.com/d1/
- **R2 Storage:** https://developers.cloudflare.com/r2/
- **Queues:** https://developers.cloudflare.com/queues/

### 17.5 Competitor Tools (for benchmarking)

- **Brandwatch:** https://www.brandwatch.com/
- **Sprout Social:** https://sproutsocial.com/
- **Hootsuite Insights:** https://www.hootsuite.com/products/insights
- **Brand24:** https://brand24.com/
- **Mention:** https://mention.com/

---

**Document Version:** 1.0
**Last Updated:** October 3, 2025
**Next Review:** After Phase 1 MVP launch (Month 3)
