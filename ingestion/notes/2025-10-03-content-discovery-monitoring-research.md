# Content Discovery & Monitoring Data Sources Research

**Research Date:** October 3, 2025
**Purpose:** Build a superior content discovery and brand monitoring API to compete with BuzzSumo, Mention, and Brand24

---

## Executive Summary

This research identifies **15+ free and paid data sources** for building a content discovery and brand monitoring platform that can compete with established players like BuzzSumo ($199-499/mo), Mention ($41-149/mo), and Brand24 ($199-599/mo).

**Key Findings:**
- **Free tier potential:** Reddit, Hacker News, Product Hunt, Dev.to, Lobsters, and YouTube APIs provide substantial free data
- **Cost advantages:** Using free sources + NewsAPI ($220-3000/mo) is significantly cheaper than Twitter API ($200-42k/mo)
- **Legal framework:** hiQ v. LinkedIn precedent supports scraping public data (not protected by CFAA)
- **Competitive edge:** API-first approach with semantic search, real-time alerts, and AI enrichment
- **Target pricing:** $29-99/mo (50-70% cheaper than competitors) with free tier for developers

**Implementation Roadmap:**
- **Phase 1 (Weeks 1-4):** Free sources (Reddit, HN, Product Hunt, Dev.to, YouTube) + basic trending algorithms
- **Phase 2 (Weeks 5-8):** NewsAPI integration, social share tracking, sentiment analysis
- **Phase 3 (Weeks 9-12):** Real-time alerts, influencer discovery, advanced analytics, API launch

---

## 1. Content Discovery Sources (15+ Platforms)

### 1.1 Reddit API ✅ FREE

**Overview:**
- 100 queries per minute (QPM) for OAuth-authenticated requests
- Access to all public subreddits, posts, comments
- Real-time trending detection via `/hot`, `/rising`, `/top` endpoints

**Rate Limits:**
- **Free tier:** 100 QPM with OAuth (10 QPM without OAuth)
- **Paid tier:** $0.24 per 1,000 API calls (for >100 QPM)
- Average over 10-minute window to support burst requests

**Data Available:**
- Post titles, content, upvotes, comments, awards
- Subreddit metadata (subscribers, activity)
- User profiles (karma, account age)
- Cross-posts and trending detection

**API Endpoints:**
```
GET /r/{subreddit}/hot
GET /r/{subreddit}/rising
GET /r/{subreddit}/top?t=day
GET /search?q=keyword&sort=relevance
GET /comments/{post_id}
```

**Commercial Use:** Allowed with OAuth authentication, respecting rate limits

**Documentation:** https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki

---

### 1.2 Hacker News API ✅ FREE

**Overview:**
- Entirely free, no authentication required
- No rate limits (use responsibly)
- Firebase-based real-time updates
- 500+ top/new stories available

**Data Available:**
- Top stories (highest-rated current stories)
- Best stories (top-voted ordered by votes)
- New stories (recently posted)
- Ask HN threads
- Show HN posts
- Comments and user data (karma, submissions)

**API Endpoints:**
```
GET https://hacker-news.firebaseio.com/v0/topstories.json
GET https://hacker-news.firebaseio.com/v0/newstories.json
GET https://hacker-news.firebaseio.com/v0/beststories.json
GET https://hacker-news.firebaseio.com/v0/item/{id}.json
GET https://hacker-news.firebaseio.com/v0/user/{username}.json
```

**Alternative:** Algolia HN Search API for advanced queries (https://hn.algolia.com/api)

**Commercial Use:** Unrestricted (check Firebase ToS)

**Documentation:** https://github.com/HackerNews/API

---

### 1.3 Product Hunt API ✅ FREE (Public Scope)

**Overview:**
- GraphQL API with OAuth 2.0
- Free for public data (requires permission for commercial use)
- Daily product launches with upvotes, comments, makers

**Data Available:**
- Latest product launches
- Upvote counts and rankings
- Comments and discussions
- Maker profiles
- Topics and categories
- Featured collections

**API Endpoints (GraphQL):**
```graphql
query {
  posts(order: VOTES) {
    edges {
      node {
        name
        tagline
        votesCount
        commentsCount
        url
        thumbnail { url }
        makers { name username }
      }
    }
  }
}
```

**Rate Limits:** Not publicly documented (reasonable use expected)

**Commercial Use:** Contact hello@producthunt.com for business use

**Documentation:** https://api.producthunt.com/v2/docs

---

### 1.4 YouTube Data API v3 ✅ FREE (10,000 units/day)

**Overview:**
- 10,000 quota units per day (free)
- Trending videos by region/category
- Video metadata, statistics, comments

**Quota Costs:**
- Search request: 100 units
- Video details: 1 unit
- Comments: 1 unit per page
- Channel info: 1 unit

**Data Available:**
- Trending videos (`chart=mostPopular`)
- Video title, description, tags, thumbnails
- View count, like count, comment count
- Channel subscriber count
- Video duration, upload date, captions

**API Endpoints:**
```
GET /youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US
GET /youtube/v3/search?part=snippet&q=keyword&type=video&order=viewCount
GET /youtube/v3/commentThreads?part=snippet&videoId={id}
```

**Higher Limits:** Request quota increase via audit process

**Documentation:** https://developers.google.com/youtube/v3

---

### 1.5 Twitter/X API v2 💰 PAID ($200-42,000/mo)

**Overview:**
- Expensive but high-value for real-time trends
- Four tiers: Free (very limited), Basic ($200/mo), Pro, Enterprise ($42k/mo)

**Pricing Tiers:**

| Tier | Price | Posts/Month | Reads/Month | Use Case |
|------|-------|-------------|-------------|----------|
| **Free** | $0 | 1,500 | 100 | Testing only |
| **Basic** | $200/mo | 50,000 | Unlimited | Small businesses |
| **Pro** | Custom | Custom | Custom | Mid-sized orgs |
| **Enterprise** | $42,000/mo | Unlimited | Unlimited | Large enterprises |

**Data Available:**
- Trending topics and hashtags
- Tweet text, media, engagement (likes, retweets)
- User profiles (follower count, bio, verified status)
- Real-time streaming
- Historical search (7-day for Free/Basic)

**API Endpoints (v2):**
```
GET /2/tweets/search/recent?query=keyword
GET /2/tweets/{id}?expansions=author_id&tweet.fields=public_metrics
GET /2/users/{id}?user.fields=public_metrics
POST /2/tweets (create tweets via API)
```

**Commercial Use:** All tiers support commercial use

**Recommendation:** Start without Twitter, add later if budget allows ($200/mo minimum)

**Documentation:** https://developer.x.com/en/docs/x-api

---

### 1.6 NewsAPI 💰 PAID ($0-3,000/mo)

**Overview:**
- 150,000+ news sources worldwide
- 14 languages, 55 countries
- Free tier for development (limited requests)

**Pricing (NewsAPI.org):**
- **Developer (Free):** 100 requests/day, development only
- **Paid plans:** Start at ~$449/mo for production use

**Alternative Providers:**

| Provider | Pricing | Sources | Features |
|----------|---------|---------|----------|
| **NewsAPI.ai** | $220-3,000/mo | Variable | Clustering, sentiment, multilingual |
| **NewsCatcher** | Custom | 90,000+ | Historical data, SLAs |
| **Perigon** | $1,749/mo | 150,000+ | Real-time, sentiment |

**Data Available:**
- Article title, description, full content
- Source name, URL, logo
- Publication date/time
- Author information
- Image URLs
- Sentiment (some providers)

**API Endpoints:**
```
GET /v2/top-headlines?country=us&category=technology
GET /v2/everything?q=keyword&from=2025-01-01&sortBy=publishedAt
GET /v2/sources?language=en&category=technology
```

**Recommendation:** Start with NewsAPI.ai at $220/mo (10K tokens) for cost-effectiveness

**Documentation:** https://newsapi.org/docs

---

### 1.7 Dev.to API ✅ FREE

**Overview:**
- Developer-focused content platform
- No authentication required for public data
- API key optional for enhanced access

**Data Available:**
- Articles (title, body, tags, reactions)
- Comments and discussions
- User profiles (followers, reputation)
- Organizations and publications
- Reading lists and series

**API Endpoints:**
```
GET /api/articles?top=7 (trending last 7 days)
GET /api/articles/latest
GET /api/articles?tag=javascript
GET /api/articles/{id}
GET /api/users/{username}
```

**Rate Limits:** Not strictly enforced (reasonable use)

**Commercial Use:** Allowed with attribution

**Documentation:** https://developers.forem.com/api

---

### 1.8 Medium API (Unofficial) ✅ FREE (Official Limited)

**Overview:**
- Official API is limited (OAuth for posting only)
- Unofficial API provides read access to articles, trending feeds

**Official API:**
- OAuth 2.0 authentication
- Create/publish posts
- Get user info
- Very limited for content discovery

**Unofficial API (mediumapi.com):**
- Fetch articles by author, publication, tag
- Trending articles by topic
- Top writers and recommended feeds
- No rate limits published (use responsibly)

**Data Available:**
- Article title, subtitle, content
- Author name, bio, follower count
- Claps (likes), reading time
- Publication info
- Tags and topics

**API Endpoints (Unofficial):**
```
GET /api/articles/{article_id}
GET /api/user/{username}/articles
GET /api/publication/{slug}/articles
GET /api/topfeeds/{tag}
GET /api/related/{article_id}
```

**Commercial Use:** Unofficial API use at own risk (check ToS)

**Documentation:**
- Official: https://github.com/Medium/medium-api-docs
- Unofficial: https://mediumapi.com/documentation.html

---

### 1.9 Lobsters ✅ FREE

**Overview:**
- Tech-focused Hacker News alternative
- Invite-only community (higher quality)
- Focus on programming, security, systems
- Open source platform

**Data Available:**
- Story titles, URLs, descriptions
- Upvotes, comment count
- Tags (programming languages, topics)
- User profiles and karma
- Transparent moderation logs

**API Information:**
- JSON feeds available
- No official rate limits (use responsibly)
- RSS feeds for all categories

**Feed Endpoints:**
```
GET https://lobste.rs/hottest.json
GET https://lobste.rs/newest.json
GET https://lobste.rs/t/{tag}.json
GET https://lobste.rs/s/{story_id}.json
```

**Commercial Use:** Check with platform (open source)

**Documentation:** https://lobste.rs/s/r9oskz/is_there_api_documentation_for_lobsters_somewhere

---

### 1.10 TikTok (Unofficial APIs) 💰 SCRAPING REQUIRED

**Overview:**
- No free official API for trending content
- Unofficial APIs and scraping tools available
- High anti-bot protection, legal gray area

**Unofficial API Options:**
- **TikAPI:** Full unofficial wrapper
- **Apify TikTok Scraper:** $0.25 per 1,000 videos
- **Python libraries:** davidteather/TikTok-Api

**Data Available:**
- Trending videos, hashtags, challenges
- Video metadata (likes, views, shares, comments)
- User profiles (followers, engagement rate)
- Audio/music trending
- Discover page content

**Challenges:**
- Anti-bot detection (browser fingerprinting, behavioral analysis)
- Rate limiting (dynamic, not published)
- Terms of Service violations risk
- Requires browser automation (Playwright, Selenium)

**Cost Estimate:**
- Apify: $0.25 per 1,000 videos
- Self-hosted: Proxy/residential IP costs (~$50-200/mo)

**Legal Considerations:**
- hiQ v. LinkedIn supports public data scraping
- TikTok ToS prohibits scraping (contract-based claims possible)
- Use at own risk, consult legal counsel

**Recommendation:** Phase 2-3 addition, start with Reddit/YouTube for video trends

**Documentation:** https://github.com/davidteather/TikTok-Api

---

### 1.11 Pinterest API ✅ FREE (Limited)

**Overview:**
- Official API with OAuth 2.0
- Rate limits: 1,000 calls/endpoint/hour (approved apps)
- Unapproved apps: 10 requests/hour

**Data Available:**
- Pins (image URL, description, link, saves)
- Boards and board sections
- User profiles (follower count, pins)
- Trending searches (Trends API)

**API Endpoints:**
```
GET /v5/pins/{pin_id}
GET /v5/boards/{board_id}/pins
GET /v5/user_account
GET /trends/keywords/{region}
```

**Rate Limits:**
- **Approved apps:** 1,000 calls/endpoint/hour per user token
- **Unapproved apps:** 10 requests/hour (sliding window)
- **Ads API:** 500-1,000 QPS depending on endpoint

**Commercial Use:** Requires app approval

**Documentation:** https://developers.pinterest.com/docs/api/v5/

---

### 1.12 RSS Feed Aggregation ✅ FREE

**Overview:**
- Universal format for blogs, news sites, podcasts
- No API keys required
- Thousands of sources available
- Python libraries: feedparser, beautifulsoup

**Sources:**
- Personal blogs (WordPress, Ghost, Substack)
- News websites (NYTimes, TechCrunch, Ars Technica)
- Podcasts (RSS feeds with episode metadata)
- Government sites, academic journals

**Tools:**
- **feedparser (Python):** Parse RSS/Atom/RDF feeds
- **beautifulsoup:** Auto-detect feed URLs from HTML
- **OPML:** Import curated feed lists

**Data Available:**
- Post title, description, content
- Publication date/time
- Author name
- Categories/tags
- Enclosures (images, audio, video)

**Implementation:**
```python
import feedparser

feed = feedparser.parse('https://example.com/feed')
for entry in feed.entries:
    print(entry.title, entry.published, entry.link)
```

**Commercial Use:** Depends on source (most allow with attribution)

**Recommendation:** Curate 500-1,000 high-quality feeds across niches

---

### 1.13 Google News (RSS) ✅ FREE

**Overview:**
- No official API (discontinued)
- RSS feeds available for topics, searches
- pygooglenews library for parsing

**RSS Feed Formats:**
```
https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en
https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US
https://news.google.com/rss/search?q=keyword&hl=en-US
```

**Data Available:**
- Article title, description
- Source name, URL
- Publication date
- Related articles
- Topic categories

**Python Library:**
```python
from pygooglenews import GoogleNews

gn = GoogleNews(country='US', lang='en')
top = gn.top_news()
tech = gn.topic_headlines('TECHNOLOGY')
search = gn.search('artificial intelligence')
```

**Rate Limits:** No official limits (use responsibly)

**Commercial Use:** Gray area (no official API ToS)

**Alternative:** NewsAPI.org as official replacement

---

### 1.14 Quora, Stack Overflow, Forums 💰 LIMITED

**Overview:**
- High-value Q&A content
- Limited or no official APIs
- Scraping required (legal gray area)

**Quora:**
- No official API
- Scraping violates ToS (contract-based claims)
- Alternative: Quora Digest emails (RSS conversion)

**Stack Overflow:**
- Stack Exchange API (free, rate-limited)
- 300 requests/day (unauthenticated)
- 10,000 requests/day (authenticated)

**Data Available:**
- Questions, answers, votes
- User reputation, badges
- Tags and topic categories
- Accepted answers

**API Endpoints (Stack Overflow):**
```
GET /2.3/questions?order=desc&sort=votes&tagged=javascript
GET /2.3/questions/{id}/answers
GET /2.3/search?order=desc&sort=activity&intitle=keyword
```

**Commercial Use:** Allowed with attribution (Stack Overflow), prohibited (Quora)

**Documentation:** https://api.stackexchange.com/docs

---

### 1.15 Podcast Aggregation ✅ FREE

**Overview:**
- Podcasts use RSS feeds (same as blogs)
- Apple Podcasts API (free)
- Spotify API (free, limited)

**Apple Podcasts API:**
- Search podcasts, episodes
- Metadata (title, description, artwork)
- No playback access

**Data Available:**
- Podcast name, author, artwork
- Episode title, description, duration
- Publication date
- Transcript URLs (if provided)

**API Endpoints (Apple):**
```
GET https://itunes.apple.com/search?term=keyword&entity=podcast
GET https://itunes.apple.com/lookup?id={podcast_id}&entity=podcastEpisode
```

**Transcript Analysis:**
- Some podcasts provide transcripts (URLs in RSS)
- Use Whisper API for audio transcription ($0.006/min)

**Commercial Use:** Apple API allows commercial use

**Documentation:** https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/

---

## 2. Social Sharing Metrics & APIs

### 2.1 Current State (2025)

**Major Platform Changes:**
- **Twitter/X:** Deprecated share count API (2015) ❌
- **Facebook:** Deprecated share count API, uses canonical URLs now ⚠️
- **LinkedIn:** Deprecated share count API ❌
- **Pinterest:** API available (rate-limited) ✅
- **Reddit:** API available (upvote/comment counts) ✅

### 2.2 Available Platforms

| Platform | API Available | Free | Rate Limits | Data Available |
|----------|---------------|------|-------------|----------------|
| **Reddit** | ✅ | ✅ | 100 QPM | Upvotes, comments, awards |
| **Hacker News** | ✅ | ✅ | None | Points, comments |
| **Pinterest** | ✅ | ✅ | 1K/hr | Pin count, saves |
| **Facebook** | ⚠️ | ❌ | N/A | Canonical URL shares only |
| **Buffer** | ✅ | ✅ | Unknown | Share counts |
| **VK** | ✅ | ✅ | Unknown | Share counts (Russia) |
| **Tumblr** | ✅ | ✅ | Unknown | Reblog counts |
| **Twitter/X** | ❌ | ❌ | N/A | Deprecated |
| **LinkedIn** | ❌ | ❌ | N/A | Deprecated |

### 2.3 Third-Party Aggregation Services

**SharedCount (Enterprise):**
- Aggregates share counts across platforms
- Pricing: Custom (enterprise-level)
- Supports: Facebook, Pinterest, Reddit, VK, Tumblr, Buffer

**BuzzSumo (Competitor):**
- Own proprietary share count aggregation
- Historical data (years of tracking)
- Part of their competitive advantage

**Our Approach:**
1. Track Reddit, HN, Pinterest directly (free APIs)
2. Use canonical URL matching for Facebook (aggregate variants)
3. Build historical database over time
4. Calculate "Total Shares" = Reddit + HN + Pinterest + Buffer + VK

### 2.4 Facebook Canonical URL Strategy

Facebook normalizes shares across URLs with same `og:url` or `<link rel="canonical">`:

**Implementation:**
1. Extract canonical URL from HTML `<head>`
2. Query Facebook Graph API (if accessible)
3. Aggregate all shares pointing to same canonical URL

**Example:**
```
https://example.com/article?utm_source=twitter
https://example.com/article?ref=facebook
https://example.com/article
→ All counted as shares of https://example.com/article (canonical)
```

---

## 3. Content Trending Algorithms & Scoring

### 3.1 Velocity-Based Trending

**Social Velocity Definition:**
> The rate of change of engagement with content across social platforms — how many new interactions (shares, likes, comments) an article/video is getting in a given time frame.

**Formula:**
```
Velocity = (Current Engagement - Previous Engagement) / Time Elapsed
```

**Implementation:**
- Track engagement at T0, T1, T2... (e.g., hourly)
- Calculate delta between intervals
- Higher velocity = trending content
- Apply time decay (recent spikes weighted higher)

**Example:**
```
Hour 0: 10 shares
Hour 1: 50 shares → Velocity = (50-10)/1hr = 40 shares/hr
Hour 2: 150 shares → Velocity = (150-50)/1hr = 100 shares/hr ↑ TRENDING
Hour 3: 180 shares → Velocity = (180-150)/1hr = 30 shares/hr ↓ Slowing
```

### 3.2 Engagement Rate Calculation

**Engagement Rate Formula:**
```
Engagement Rate = (Likes + Comments + Shares) / (Followers or Reach) × 100
```

**Platform-Specific:**
- **Instagram:** (Likes + Comments) / Followers × 100
- **YouTube:** (Likes + Comments) / Views × 100
- **Twitter:** (Likes + Retweets + Replies) / Followers × 100
- **TikTok:** (Likes + Comments + Shares) / Views × 100

**Benchmarks (2025):**
- Instagram: 1-5% (good), >5% (excellent)
- YouTube: 4-10% (good)
- TikTok: 5-15% (good), >15% (viral)

### 3.3 Z-Score (Statistical Trending)

**Purpose:** Identify content trending unusually high vs. historical baseline

**Formula:**
```
Z-Score = (Current Value - Historical Mean) / Historical Standard Deviation
```

**Interpretation:**
- Z > 2: Content performing >2 standard deviations above average (trending)
- Z > 3: Exceptionally viral content
- Z < 0: Below average performance

**Example:**
```
Historical average shares: 100 (mean), σ = 30 (std dev)
Current shares: 200
Z-Score = (200 - 100) / 30 = 3.33 → HIGHLY TRENDING
```

**Implementation:**
- Calculate mean/std dev per source, topic, author
- Update rolling 30-day averages
- Detect anomalies (viral breakouts)

### 3.4 Platform-Specific Algorithms

**Reddit Hot Score:**
```python
def hot_score(upvotes, downvotes, timestamp):
    score = upvotes - downvotes
    order = log10(max(abs(score), 1))
    sign = 1 if score > 0 else -1 if score < 0 else 0
    seconds_since_epoch = timestamp - 1134028003  # Reddit launch
    return sign * order + seconds_since_epoch / 45000
```

**Hacker News Ranking:**
```
Score = (Upvotes - 1) / (Age_Hours + 2)^1.8
```
- Gravity: 1.8 (older content decays faster)
- Penalty for age
- Boosts newer content

**Time Decay (General):**
```
Adjusted Score = Raw Score / (1 + Age_Hours)^Decay_Factor
```
- Decay Factor: 0.5-2.0 (higher = faster decay)
- Balances recency vs. popularity

### 3.5 Influencer Amplification

**Concept:** Content shared by high-follower accounts gets amplified

**Weighted Shares Formula:**
```
Weighted Shares = Σ (Share × log10(Follower_Count))
```

**Example:**
- User A (1K followers) shares → Weight = log10(1000) = 3
- User B (100K followers) shares → Weight = log10(100000) = 5
- Total Weighted = 3 + 5 = 8 (vs. 2 unweighted shares)

**Implementation:**
- Track sharer follower count
- Apply logarithmic weighting (prevents billionaire domination)
- Combine with velocity/engagement scoring

### 3.6 Topic Relevance Scoring

**Keyword Matching:**
- Extract keywords from content (TF-IDF, RAKE)
- Match against user-defined topics
- Score: % of keywords matched

**Category Filtering:**
- Platform tags (Reddit subreddit, Dev.to tags)
- ML classification (if needed)
- Boolean filters (AND/OR/NOT)

**NLP Topic Modeling:**
- LDA (Latent Dirichlet Allocation)
- Sentence embeddings (semantic similarity)
- Cluster related content

### 3.7 Composite Trending Score

**Weighted Formula:**
```
Trending Score =
  0.3 × Velocity_Score +
  0.2 × Engagement_Rate +
  0.2 × Z_Score +
  0.15 × Influencer_Amplification +
  0.1 × Recency_Boost +
  0.05 × Source_Authority
```

**Normalization:**
- Scale all components to 0-100
- Apply weights based on use case
- Adjust dynamically (A/B testing)

**Customization:**
- Users can adjust weights
- Filter by platform, topic, geography
- Set minimum thresholds (e.g., >10 shares)

---

## 4. Brand Mention Monitoring

### 4.1 Sources for Monitoring

| Source | Coverage | API | Real-Time | Cost |
|--------|----------|-----|-----------|------|
| **Twitter/X** | High | ✅ | ✅ | $200-42k/mo |
| **Reddit** | High | ✅ | ⚠️ | Free (100 QPM) |
| **Hacker News** | Medium | ✅ | ⚠️ | Free |
| **YouTube** | High | ✅ | ❌ | Free (10K/day) |
| **News Sites** | High | ✅ | ✅ | $220-3k/mo |
| **Blogs** | Medium | RSS | ❌ | Free |
| **Podcasts** | Low | RSS | ❌ | Free |
| **Forums** | Low | Scraping | ❌ | Varies |

### 4.2 Monitoring Strategies

**Keyword Search:**
- Brand name (exact match, variations)
- Product names
- Competitor names
- Executive names (CEO, founders)
- Domain names
- Campaign hashtags

**Boolean Operators:**
```
"Brand Name" OR "BrandName" OR "@BrandHandle"
"Product Name" AND (review OR opinion OR feedback)
"Competitor" NOT "our brand" (competitive intelligence)
```

**Multi-Platform Queries:**
```python
queries = [
    {"platform": "reddit", "query": "brand name", "subreddits": ["technology", "startup"]},
    {"platform": "hackernews", "query": "brand name"},
    {"platform": "twitter", "query": "brand name OR @handle"},
    {"platform": "news", "query": "brand name", "language": "en"}
]
```

### 4.3 Mention Context Analysis

**Sentiment Detection:**
- Positive: "love", "amazing", "best", "recommend"
- Negative: "hate", "terrible", "worst", "avoid", "scam"
- Neutral: "just bought", "trying out", "anyone used?"

**Mention Types:**
- **Direct:** "@brand please fix this"
- **Indirect:** "Company X's product is great"
- **Comparative:** "Brand A vs Brand B"
- **Question:** "Has anyone tried Brand X?"

**Urgency/Priority:**
- 🔴 **High:** Negative sentiment + high reach + media outlet
- 🟡 **Medium:** Neutral/positive + medium reach
- 🟢 **Low:** Positive + low reach

### 4.4 Real-Time Alert Triggers

**Alert Conditions:**
```yaml
alerts:
  - name: "Negative Mention - High Priority"
    conditions:
      - sentiment: negative
      - reach: >10000 followers
      - platform: ["twitter", "news", "reddit"]
    action:
      - slack_webhook
      - email: urgent@company.com
      - sms: +1234567890

  - name: "Viral Post"
    conditions:
      - velocity: >100 shares/hour
      - mentions_brand: true
    action:
      - slack_webhook
      - email: marketing@company.com

  - name: "Competitor Mentioned"
    conditions:
      - keyword: "Competitor X"
      - sentiment: positive
      - platform: ["reddit", "hackernews"]
    action:
      - email: competitive-intel@company.com
```

**Alert Channels:**
- Webhook (Slack, Discord, Teams, custom)
- Email (individual, digest)
- SMS (Twilio for urgent)
- Mobile push notification
- In-app notification

### 4.5 Crisis Detection

**Anomaly Detection:**
- Sudden spike in negative mentions (>3σ above baseline)
- Rapid velocity increase (>10x normal rate)
- High-reach accounts amplifying negative content

**Crisis Thresholds:**
```python
def detect_crisis(mentions_last_hour, historical_avg, sentiment_score):
    threshold_multiplier = 5
    if mentions_last_hour > historical_avg * threshold_multiplier:
        if sentiment_score < -0.5:  # Negative sentiment
            return "CRISIS_ALERT"
    return "NORMAL"
```

**Auto-Response Protocols:**
1. Immediate alert to PR team
2. Summary of top negative posts
3. Suggested response templates
4. Escalation to executives if threshold exceeded

---

## 5. Influencer Discovery

### 5.1 Metrics for Identification

**Primary Metrics:**
- **Follower Count:** Tier classification (nano, micro, macro, mega)
- **Engagement Rate:** (Likes + Comments + Shares) / Followers
- **Content Frequency:** Posts per week/month
- **Niche Relevance:** Keywords/topics covered
- **Audience Demographics:** Age, location, interests

**Tier Classification:**
- **Nano:** 1K-10K followers (high engagement, authentic)
- **Micro:** 10K-100K followers (niche experts)
- **Macro:** 100K-1M followers (broad reach)
- **Mega:** 1M+ followers (celebrities, mass appeal)

### 5.2 Engagement Rate Calculation

**Formula (Platform-Specific):**
```
Instagram: (Likes + Comments) / Followers × 100
YouTube: (Likes + Comments) / Subscribers × 100
TikTok: (Likes + Comments + Shares) / Followers × 100
Twitter: (Likes + Retweets + Replies) / Followers × 100
```

**Benchmarks (2025):**
| Tier | Instagram | YouTube | TikTok | Twitter |
|------|-----------|---------|--------|---------|
| Nano | 5-10% | 8-15% | 10-20% | 2-5% |
| Micro | 3-7% | 5-10% | 7-15% | 1-3% |
| Macro | 1-3% | 3-7% | 4-10% | 0.5-2% |
| Mega | 0.5-2% | 1-5% | 2-8% | 0.2-1% |

### 5.3 Discovery Methods

**High-Engagement Content Filtering:**
```sql
SELECT author_id, author_name, follower_count,
       AVG(engagement_rate) as avg_engagement
FROM content_posts
WHERE engagement_rate > 0.05  -- 5%+ engagement
GROUP BY author_id
HAVING COUNT(*) >= 10  -- At least 10 posts
ORDER BY avg_engagement DESC
```

**Topic Authority:**
- Authors consistently posting about specific topics
- High share counts in niche communities (Reddit, HN)
- Cited by other influencers

**Audience Quality:**
- Real vs. fake followers (engagement rate indicator)
- Audience location (relevant to your market?)
- Audience interests (aligned with your brand?)

### 5.4 Influencer Scoring

**Composite Influencer Score:**
```
Influencer Score =
  0.25 × Reach (log10(followers))
  + 0.30 × Engagement Rate
  + 0.20 × Content Quality (avg shares/post)
  + 0.15 × Posting Frequency (consistency)
  + 0.10 × Niche Relevance (keyword match)
```

**Example:**
```python
def calculate_influencer_score(influencer):
    reach_score = min(log10(influencer.followers) / 6 * 100, 100)  # Cap at 1M
    engagement_score = min(influencer.engagement_rate * 10, 100)  # 10% = 100 points
    quality_score = min(influencer.avg_shares_per_post / 10, 100)  # 1000 shares = 100 points
    frequency_score = min(influencer.posts_per_month / 20 * 100, 100)  # 20/mo = 100
    relevance_score = influencer.keyword_match_percentage

    return (0.25 * reach_score + 0.30 * engagement_score +
            0.20 * quality_score + 0.15 * frequency_score + 0.10 * relevance_score)
```

### 5.5 Third-Party Influencer APIs

**Commercial Options:**
- **Modash API:** 350M+ profiles, $16,200/year
- **Upfluence API:** Influencer discovery + management
- **GRIN:** Creator database with engagement metrics
- **HypeAuditor:** 81M profiles, AI fraud detection
- **InsightIQ:** 450M+ influencers, 100+ attributes

**Our Approach (Cost-Effective):**
1. Build influencer database from Reddit, Twitter, YouTube APIs
2. Calculate engagement metrics from our content data
3. Track influencer share patterns over time
4. Offer basic influencer discovery (50-70% cheaper than competitors)

---

## 6. Content Analysis & Enrichment

### 6.1 Headline Analysis

**Metrics:**
- **Length:** Character/word count (optimal: 60-80 chars, 8-12 words)
- **Power Words:** Count of emotional triggers ("amazing", "secret", "urgent")
- **Numbers:** Presence of digits (e.g., "7 Ways to...")
- **Questions:** "How to", "Why", "What"
- **Sentiment:** Positive/negative/neutral tone

**Power Words Categories:**
- **Curiosity:** "secret", "hidden", "revealed", "truth"
- **Urgency:** "now", "today", "urgent", "deadline"
- **Exclusivity:** "exclusive", "only", "limited", "insider"
- **Superlatives:** "best", "ultimate", "complete", "definitive"

**Implementation:**
```python
def analyze_headline(title):
    word_count = len(title.split())
    char_count = len(title)
    has_number = bool(re.search(r'\d', title))
    power_words = count_power_words(title)
    sentiment = sentiment_analyzer.polarity_scores(title)

    score = (
        (1 if 8 <= word_count <= 12 else 0.5) * 30 +
        (1 if 60 <= char_count <= 80 else 0.7) * 20 +
        (1 if has_number else 0) * 15 +
        min(power_words / 3, 1) * 20 +
        (sentiment['compound'] + 1) / 2 * 15
    )
    return score
```

### 6.2 Content Format Detection

**Types:**
- **Article:** Long-form text (>500 words)
- **Video:** YouTube, TikTok, embedded players
- **Infographic:** High aspect ratio images, data visualizations
- **Podcast:** Audio file, episode metadata
- **Interactive:** Quizzes, calculators, tools
- **List:** Numbered/bulleted format ("10 Best...", "Top 5...")

**Detection Methods:**
- URL patterns (youtube.com, spotify.com, etc.)
- HTML tags (`<video>`, `<audio>`, `<iframe>`)
- Content structure (ordered/unordered lists)
- Word count thresholds

### 6.3 Keyword Extraction (NLP)

**TF-IDF (Term Frequency-Inverse Document Frequency):**
- Finds words with high frequency in current document vs. corpus
- Requires document collection (corpus)
- Formula: `TF-IDF = (Count in Doc / Total Words) × log(Total Docs / Docs with Term)`

**RAKE (Rapid Automatic Keyword Extraction):**
- Extracts phrases (not just words)
- Identifies word co-occurrences
- No corpus required (single document)
- Steps: Find candidate phrases → Build co-occurrence graph → Score phrases

**Implementation (Python):**
```python
from rake_nltk import Rake
from sklearn.feature_extraction.text import TfidfVectorizer

# RAKE
rake = Rake()
rake.extract_keywords_from_text(content)
keywords = rake.get_ranked_phrases()[:10]

# TF-IDF
vectorizer = TfidfVectorizer(max_features=10)
tfidf_matrix = vectorizer.fit_transform([content])
keywords = vectorizer.get_feature_names_out()
```

**AI-Based (GPT-4, Claude):**
```python
prompt = f"Extract 10 key topics/keywords from this content:\n\n{content[:2000]}"
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": prompt}]
)
keywords = response.choices[0].message.content.split(', ')
```

### 6.4 Sentiment Analysis

**Methods:**
1. **Lexicon-Based:** VADER, TextBlob (fast, simple)
2. **ML Models:** BERT, RoBERTa (accurate, slower)
3. **Cloud APIs:** Google NLP, AWS Comprehend, Azure AI

**VADER (Python):**
```python
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

analyzer = SentimentIntensityAnalyzer()
scores = analyzer.polarity_scores(text)
# {'neg': 0.0, 'neu': 0.5, 'pos': 0.5, 'compound': 0.6369}

if scores['compound'] >= 0.05:
    sentiment = 'positive'
elif scores['compound'] <= -0.05:
    sentiment = 'negative'
else:
    sentiment = 'neutral'
```

**Google Cloud NLP API:**
```python
from google.cloud import language_v1

client = language_v1.LanguageServiceClient()
document = language_v1.Document(content=text, type_=language_v1.Document.Type.PLAIN_TEXT)
sentiment = client.analyze_sentiment(request={'document': document}).document_sentiment

# sentiment.score: -1.0 (negative) to 1.0 (positive)
# sentiment.magnitude: 0.0+ (strength of emotion)
```

**Cost Comparison:**
- VADER: Free (local processing)
- Google NLP: $1 per 1,000 requests
- AWS Comprehend: $0.0001 per unit (100 chars)
- Azure AI: $2 per 1,000 text records

**Recommendation:** Use VADER for real-time, Google NLP for high-accuracy historical analysis

### 6.5 Reading Level & Structure

**Flesch-Kincaid Score:**
```python
import textstat

reading_ease = textstat.flesch_reading_ease(content)
grade_level = textstat.flesch_kincaid_grade(content)

# 90-100: Very easy (5th grade)
# 60-70: Standard (8th-9th grade)
# 30-50: Difficult (college)
# 0-30: Very difficult (professional)
```

**Content Structure:**
- Word count
- Paragraph count (avg words per paragraph)
- Sentence count (avg words per sentence)
- Subheading count (`<h2>`, `<h3>`)
- Image/video count
- List count (ordered/unordered)

### 6.6 Entity Recognition (NER)

**Extract:**
- **People:** Names of individuals
- **Organizations:** Company names
- **Products:** Product/service names
- **Locations:** Cities, countries
- **Events:** Conferences, launches

**spaCy (Python):**
```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp(content)

entities = {
    'people': [ent.text for ent in doc.ents if ent.label_ == 'PERSON'],
    'orgs': [ent.text for ent in doc.ents if ent.label_ == 'ORG'],
    'products': [ent.text for ent in doc.ents if ent.label_ == 'PRODUCT'],
    'locations': [ent.text for ent in doc.ents if ent.label_ == 'GPE'],
}
```

### 6.7 Image Analysis

**Detect:**
- Logos (brand detection)
- Faces (people count)
- Text in images (OCR)
- Objects (cars, products, etc.)

**Google Vision API:**
```python
from google.cloud import vision

client = vision.ImageAnnotatorClient()
image = vision.Image(source=vision.ImageSource(image_uri=image_url))

# Logo detection
logos = client.logo_detection(image=image).logo_annotations

# Face detection
faces = client.face_detection(image=image).face_annotations

# Text detection (OCR)
texts = client.text_detection(image=image).text_annotations

# Object detection
objects = client.object_localization(image=image).localized_object_annotations
```

**Cost:** $1.50-$3 per 1,000 images (depending on features)

**Recommendation:** Process images for high-value content only (>100 shares)

### 6.8 Video Transcription

**YouTube:** Free captions API (many videos have auto-generated captions)

**Whisper API (OpenAI):**
```python
import openai

audio_file = open("audio.mp3", "rb")
transcript = openai.Audio.transcribe("whisper-1", audio_file)
```

**Cost:** $0.006 per minute ($0.36 per hour)

**Use Cases:**
- Podcast mention monitoring
- Video keyword extraction
- Sentiment analysis of spoken content

---

## 7. Backlink & SEO Value Analysis

### 7.1 Domain Authority Metrics

**Moz Domain Authority (DA):**
- Scale: 0-100
- Factors: Link profile, domain age, site size
- First introduced: 2004
- Access: Moz API (paid), bulk checkers (free limited)

**Ahrefs Domain Rating (DR):**
- Scale: 0-100
- Focus: Backlink profile quality & quantity
- Factors: Number of referring domains, backlink strength
- Access: Ahrefs API (paid), free checker (limited)

**Comparison:**
| Metric | Provider | Focus | Correlation with Rankings |
|--------|----------|-------|---------------------------|
| DA | Moz | Overall authority | Moderate-High |
| DR | Ahrefs | Backlink strength | High |
| AS | SEMrush | Authority Score | Moderate |
| TF/CF | Majestic | Trust/Citation Flow | Moderate |

**Research Finding:** Ahrefs gives highest authority in 50% of cases, Moz 31%

### 7.2 Backlink Potential

**Dofollow vs. Nofollow:**
- **Dofollow:** Passes "link juice" (SEO value)
- **Nofollow:** No direct SEO benefit (but still traffic value)

**Link Value Factors:**
- Domain authority of linking site
- Page authority of specific page
- Relevance of linking site to your niche
- Anchor text (branded, exact match, generic)
- Link placement (editorial content > sidebar > footer)

**Estimating Backlink Value:**
```python
def estimate_backlink_value(domain_authority, dofollow, relevance_score):
    base_value = domain_authority / 10  # 0-10 scale
    if dofollow:
        base_value *= 1.5
    base_value *= relevance_score  # 0-1 scale
    return base_value
```

### 7.3 Traffic Estimation

**Tools:**
- **SimilarWeb:** Website traffic estimates (paid API)
- **Ahrefs:** Organic traffic estimates (paid)
- **SEMrush:** Traffic analytics (paid)

**Our Approach (Cost-Effective):**
- Use Ahrefs/Moz DA as proxy for traffic
- Track content shares as indirect traffic indicator
- Estimate: High DA (>70) + High shares = High traffic potential

### 7.4 Organic Keywords

**Data Sources:**
- **SEMrush API:** Organic keywords, search volume, CPC
- **Ahrefs API:** Keywords, SERP data, backlinks
- **Google Search Console:** Own site keywords (free)

**Cost:**
- SEMrush: $129.95/mo (Pro plan)
- Ahrefs: $129/mo (Lite plan)

**Recommendation:** Phase 3 feature (optional premium add-on)

### 7.5 Competitor SEO Intelligence

**Use Case:** Track competitor content performance + SEO value

**Metrics:**
- Competitor content ranking keywords
- Backlinks to competitor content
- Estimated traffic to competitor content
- Content gaps (keywords they rank for, you don't)

**Implementation:**
```python
competitor_content = get_content(filters={'domain': 'competitor.com'})
for article in competitor_content:
    keywords = get_ranking_keywords(article.url)  # Ahrefs/SEMrush
    backlinks = get_backlinks(article.url)
    traffic_est = estimate_traffic(keywords)

    store_competitive_intel({
        'article': article,
        'keywords': keywords,
        'backlinks': backlinks,
        'traffic': traffic_est
    })
```

---

## 8. Competitive Content Intelligence

### 8.1 Competitor Content Performance

**Track:**
- Competitor URLs in content database
- Share counts, engagement rates
- Trending score over time
- Top-performing content (all-time, monthly, weekly)

**Comparison Metrics:**
```python
def compare_to_competitor(our_avg_shares, competitor_avg_shares):
    performance_ratio = our_avg_shares / competitor_avg_shares
    if performance_ratio > 1.2:
        return "Outperforming"
    elif performance_ratio < 0.8:
        return "Underperforming"
    else:
        return "On Par"
```

### 8.2 Content Gap Analysis

**Identify:**
- Topics competitors cover that you don't
- Keywords competitors rank for (SEO gap)
- Content formats competitors use (video vs. article)
- Publishing frequency (posts per week)

**Implementation:**
```sql
-- Topics competitors cover but we don't
SELECT topic, COUNT(*) as competitor_posts
FROM content
WHERE domain IN ('competitor1.com', 'competitor2.com')
AND topic NOT IN (
    SELECT DISTINCT topic FROM content WHERE domain = 'ourdomain.com'
)
GROUP BY topic
ORDER BY competitor_posts DESC
LIMIT 20;
```

### 8.3 Share of Voice (SOV)

**Definition:** Your brand mentions vs. competitor mentions in a given time period

**Formula:**
```
Share of Voice = (Your Mentions / Total Industry Mentions) × 100
```

**Example:**
- Your brand: 500 mentions
- Competitor A: 800 mentions
- Competitor B: 600 mentions
- Competitor C: 300 mentions
- Total: 2,200 mentions

**Your SOV:** (500 / 2,200) × 100 = 22.7%

**Tracking:**
```python
mentions = {
    'Your Brand': count_mentions('Your Brand'),
    'Competitor A': count_mentions('Competitor A'),
    'Competitor B': count_mentions('Competitor B'),
    'Competitor C': count_mentions('Competitor C'),
}
total = sum(mentions.values())
sov = {brand: (count / total * 100) for brand, count in mentions.items()}
```

### 8.4 Engagement Comparison

**Benchmark Against Competitors:**
```python
our_engagement = {
    'avg_shares': 150,
    'avg_comments': 25,
    'engagement_rate': 3.5
}

competitor_engagement = {
    'Competitor A': {'avg_shares': 200, 'avg_comments': 30, 'engagement_rate': 4.2},
    'Competitor B': {'avg_shares': 120, 'avg_comments': 20, 'engagement_rate': 2.8},
}

# Visualize comparison (dashboard)
```

### 8.5 Competitive Alerts

**Alert Triggers:**
- Competitor publishes content with >500 shares in 24 hours
- Competitor content goes viral (>1,000 shares/day)
- New competitor enters space (mentions spike)
- Competitor launches new product (keywords detected)

**Use Case:**
- Stay informed on competitor moves
- Identify trending topics to replicate
- Benchmark your performance

---

## 9. Real-Time Alerts & Crisis Detection

### 9.1 Alert Architecture

**Components:**
1. **Polling Workers:** Check APIs every 5-15 minutes
2. **Streaming Listeners:** Real-time (Twitter Streaming, Reddit WebSocket)
3. **Alert Engine:** Evaluate conditions, trigger notifications
4. **Notification Delivery:** Webhooks, email, SMS, push

**Flow:**
```
Data Source → Ingestion Worker → Alert Engine → (Condition Met?) → Notification Delivery
```

### 9.2 Alert Conditions

**Brand Mention:**
```yaml
alert:
  name: "Brand Mentioned on Twitter"
  conditions:
    - platform: twitter
    - keyword: "YourBrand"
    - sentiment: any
  throttle: 5 minutes  # Max 1 alert per 5 min
  delivery: webhook
```

**Negative Sentiment Spike:**
```yaml
alert:
  name: "Negative Sentiment Spike"
  conditions:
    - sentiment: negative
    - sentiment_score: < -0.6
    - mentions_last_hour: > 50
    - baseline_multiplier: > 3x
  priority: high
  delivery: [webhook, sms, email]
```

**Viral Content:**
```yaml
alert:
  name: "Content Going Viral"
  conditions:
    - velocity: > 100 shares/hour
    - total_shares: > 1000
    - keywords: ["your brand", "your product"]
  delivery: webhook
```

**Competitor Activity:**
```yaml
alert:
  name: "Competitor Viral Post"
  conditions:
    - competitor: true
    - total_shares: > 500
    - platform: ["reddit", "hackernews"]
  delivery: email
```

### 9.3 Crisis Detection Algorithms

**Anomaly Detection:**
```python
def detect_crisis(current_mentions, historical_avg, historical_std, sentiment):
    z_score = (current_mentions - historical_avg) / historical_std

    if z_score > 3 and sentiment < -0.5:
        return {"level": "CRITICAL", "z_score": z_score}
    elif z_score > 2 and sentiment < -0.3:
        return {"level": "WARNING", "z_score": z_score}
    else:
        return {"level": "NORMAL", "z_score": z_score}
```

**Crisis Indicators:**
- Mentions increase >5x baseline (statistical anomaly)
- Negative sentiment >70% of mentions
- High-reach accounts (>100K followers) amplifying
- Media outlet coverage (news sites)
- Rapid velocity (doubling every hour)

### 9.4 Alert Delivery Methods

**Webhooks:**
```python
import requests

def send_webhook(webhook_url, alert_data):
    payload = {
        "alert_type": alert_data['type'],
        "priority": alert_data['priority'],
        "message": alert_data['message'],
        "url": alert_data['url'],
        "timestamp": alert_data['timestamp']
    }
    requests.post(webhook_url, json=payload)
```

**Slack Integration:**
```python
def send_slack_alert(webhook_url, alert):
    payload = {
        "text": f"🚨 {alert['title']}",
        "blocks": [
            {"type": "section", "text": {"type": "mrkdwn", "text": alert['message']}},
            {"type": "section", "text": {"type": "mrkdwn", "text": f"*Link:* {alert['url']}"}}
        ]
    }
    requests.post(webhook_url, json=payload)
```

**Email:**
```python
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def send_email_alert(to_email, alert):
    message = Mail(
        from_email='alerts@yourplatform.com',
        to_emails=to_email,
        subject=f"[{alert['priority']}] {alert['title']}",
        html_content=f"<h2>{alert['title']}</h2><p>{alert['message']}</p><a href='{alert['url']}'>View Content</a>"
    )
    sg = SendGridAPIClient(api_key=os.environ.get('SENDGRID_API_KEY'))
    sg.send(message)
```

**SMS (Twilio):**
```python
from twilio.rest import Client

def send_sms_alert(phone_number, alert):
    client = Client(account_sid, auth_token)
    message = client.messages.create(
        body=f"[{alert['priority']}] {alert['title']}: {alert['url']}",
        from_='+1234567890',
        to=phone_number
    )
```

### 9.5 Alert Throttling & Deduplication

**Problem:** Avoid alert fatigue (too many notifications)

**Solutions:**
- **Rate Limiting:** Max 1 alert per keyword per 5-15 minutes
- **Batching:** Group similar alerts into digest (hourly, daily)
- **Threshold:** Only alert if significance score >X
- **Deduplication:** Same content shared on multiple platforms → 1 alert

**Implementation:**
```python
from datetime import datetime, timedelta

alert_cache = {}  # {(keyword, platform): last_sent_time}

def should_send_alert(keyword, platform, throttle_minutes=5):
    key = (keyword, platform)
    last_sent = alert_cache.get(key)

    if last_sent and datetime.now() - last_sent < timedelta(minutes=throttle_minutes):
        return False  # Throttled

    alert_cache[key] = datetime.now()
    return True
```

---

## 10. Historical Trending & Seasonality

### 10.1 Historical Viral Content

**"On This Day" Feature:**
- What content went viral 1 year ago today?
- Anniversary-based content ideas
- Seasonal trend predictions

**Implementation:**
```sql
SELECT title, url, total_shares, published_date
FROM content
WHERE EXTRACT(MONTH FROM published_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(DAY FROM published_date) = EXTRACT(DAY FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM published_date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
  AND total_shares > 1000
ORDER BY total_shares DESC
LIMIT 10;
```

### 10.2 Topic Seasonality

**Identify:**
- When does topic X trend annually? (e.g., "taxes" → April)
- Seasonal keywords (e.g., "back to school" → August)
- Holiday-related content spikes

**Analysis:**
```python
def analyze_seasonality(keyword, historical_data):
    monthly_mentions = {}
    for month in range(1, 13):
        mentions = [d for d in historical_data if d['date'].month == month and keyword in d['text']]
        monthly_mentions[month] = len(mentions)

    peak_month = max(monthly_mentions, key=monthly_mentions.get)
    return {"keyword": keyword, "peak_month": peak_month, "mentions": monthly_mentions}
```

**Use Case:**
- Plan content calendar around seasonal trends
- Predict upcoming topic spikes
- Optimize publishing timing

### 10.3 Evergreen vs. Timely Content

**Evergreen:**
- Long-term relevance (e.g., "How to tie a tie")
- Slow, steady engagement over time
- Low velocity, consistent shares

**Timely:**
- News, events, trending topics
- High velocity, rapid decay
- Spike in shares, then decline

**Detection:**
```python
def classify_content_lifecycle(share_timeline):
    max_shares = max(share_timeline)
    max_index = share_timeline.index(max_shares)

    if max_index <= len(share_timeline) * 0.2:  # Peak early
        return "timely"
    elif max(share_timeline[-30:]) > max_shares * 0.5:  # Still strong after 30 days
        return "evergreen"
    else:
        return "mixed"
```

### 10.4 Content Decay Analysis

**Measure:** How fast does engagement drop after publication?

**Half-Life Formula:**
```
Half-Life = Time for shares to drop to 50% of peak
```

**Platform Averages (2025 estimates):**
- Twitter: 18 minutes (extremely fast decay)
- Reddit: 6-12 hours (subreddit-dependent)
- Hacker News: 24 hours (front page cycle)
- LinkedIn: 24 hours
- Evergreen content: 30-90 days

**Implementation:**
```python
def calculate_half_life(share_timeline):
    peak_shares = max(share_timeline)
    half_peak = peak_shares / 2

    for i, shares in enumerate(share_timeline):
        if shares <= half_peak:
            return i  # Hours since peak

    return len(share_timeline)  # Still above half-life
```

---

## 11. Cost Analysis & Competitor Pricing

### 11.1 Competitor Pricing (2025)

**BuzzSumo:**
| Plan | Price/Month | Features |
|------|-------------|----------|
| Content Creation | $199 | Content discovery, influencer search, small teams |
| PR & Comms | $299 | +Question analyzer, Facebook analyzer |
| Suite | $499 | +Extensive data, customization |
| Enterprise | $499+ | +API access, historical data |

**Key Features:** Proprietary share count data, influencer database, content analyzer, API access (Enterprise only)

**Mention:**
| Plan | Price/Month | Features |
|------|-------------|----------|
| Solo | $41 | Basic monitoring, 2 keywords |
| Pro | ~$100 | More keywords, advanced analytics |
| Company | ~$149+ | Team collaboration, API |

**Key Features:** 1B+ sources, real-time alerts, social media management, sentiment analysis

**Brand24:**
| Plan | Price/Month (Annual) | Keywords | Mentions/Month |
|------|----------------------|----------|----------------|
| Individual | $79 | 3 | 2,000 |
| Team | $149 | 7 | 5,000 |
| Pro | $199 | 12 | 25,000 |
| Enterprise | $399+ | 25 | 100,000 |

**Key Features:** Real-time alerts, sentiment analysis, discussion volume chart, API access

### 11.2 Our Infrastructure Costs

**Data Source Costs (Monthly):**
| Source | Cost | Notes |
|--------|------|-------|
| Reddit API | $0 | Free (100 QPM) |
| Hacker News API | $0 | Free (no limits) |
| Product Hunt API | $0 | Free (public scope) |
| YouTube API | $0 | Free (10K units/day) |
| Dev.to API | $0 | Free |
| Lobsters | $0 | Free |
| Pinterest API | $0 | Free (limited) |
| RSS Feeds | $0 | Free |
| **NewsAPI.ai** | $220 | 10K tokens |
| Twitter API | $200-42K | Optional (Phase 2) |
| **Total (Phase 1)** | **$220** | Without Twitter |
| **Total (Phase 2)** | **$420** | With Twitter Basic |

**Cloudflare Infrastructure:**
| Service | Cost | Usage |
|---------|------|-------|
| Workers | $5 | 100K requests/day (included in $5 plan) |
| R2 Storage | ~$15 | 100GB storage + retrieval |
| D1 Database | $5 | 100K rows, 10M reads |
| Queue | $2 | 1M operations |
| **Total** | **~$27** | Low-volume estimate |

**AI/NLP Costs:**
| Service | Cost | Usage |
|---------|------|-------|
| VADER Sentiment | $0 | Local (Python library) |
| Google Vision API | $10 | ~5,000 images/month |
| GPT-4 Summarization | $50 | ~100 articles/day (optional) |
| **Total** | **$60** | Optional enrichment |

**Total Monthly Costs:**
- **Phase 1 (MVP):** $247 ($220 NewsAPI + $27 Cloudflare)
- **Phase 2 (+ Twitter):** $447 (+$200 Twitter Basic)
- **Phase 3 (+ AI):** $507 (+$60 AI enrichment)

**Per-Content Cost:**
- Tracking 10K articles/day: $0.0008 per article ($247 / 300K articles)
- Tracking 100K articles/day: $0.00008 per article

### 11.3 Pricing Strategy

**Target Customer:** Startups, agencies, indie makers, content marketers

**Pricing Tiers:**

| Plan | Price | Features | Target Market |
|------|-------|----------|---------------|
| **Free** | $0 | 100 tracked keywords, 1K mentions/mo, 7-day history, basic alerts | Developers, hobby projects |
| **Starter** | $29/mo | 500 keywords, 10K mentions/mo, 30-day history, Slack/email alerts, API access | Solo marketers, small startups |
| **Growth** | $79/mo | 2,000 keywords, 50K mentions/mo, 90-day history, sentiment analysis, influencer discovery, custom alerts | Growing companies, agencies |
| **Pro** | $149/mo | 5,000 keywords, 200K mentions/mo, 1-year history, AI enrichment, competitor tracking, white-label API | Established businesses |
| **Enterprise** | $299/mo | Unlimited keywords, unlimited mentions, full history, dedicated support, SLA, custom integrations | Large enterprises |

**Competitive Positioning:**
- **50-70% cheaper** than BuzzSumo, Mention, Brand24
- **API-first** (all tiers have API access, unlike competitors)
- **Transparent pricing** (no "contact sales")
- **Free tier** (unlike competitors)

### 11.4 Revenue Projections

**Assumptions:**
- 1,000 free users (no revenue)
- 500 Starter ($29) = $14,500/mo
- 200 Growth ($79) = $15,800/mo
- 50 Pro ($149) = $7,450/mo
- 10 Enterprise ($299) = $2,990/mo

**Total MRR:** $40,740/mo (~$489K/year)

**Costs:**
- Data sources: $507/mo
- Cloudflare (scaled): $200/mo (10M requests/day)
- Team (2 engineers): $20K/mo
- **Total costs:** $20,707/mo

**Gross Profit:** $20,033/mo (49% margin)

**Break-Even:** ~500 paying customers ($25K MRR)

---

## 12. Technical Implementation

### 12.1 Architecture Overview

**Components:**
```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers                      │
├─────────────────────────────────────────────────────────────┤
│  API Gateway  │  Ingestion Workers  │  Alert Engine  │ UI  │
└────────┬──────┴──────────┬──────────┴────────┬───────┴─────┘
         │                 │                    │
         ▼                 ▼                    ▼
    ┌────────┐      ┌────────────┐      ┌──────────┐
    │   D1   │      │  R2 Storage │      │  Queue   │
    │Database│      │  (Content)  │      │ (Jobs)   │
    └────────┘      └────────────┘      └──────────┘
         │                 │                    │
         └─────────────────┴────────────────────┘
                           │
                           ▼
                   ┌──────────────┐
                   │ External APIs│
                   │ (Reddit, HN, │
                   │  NewsAPI...) │
                   └──────────────┘
```

### 12.2 Polling Strategy

**Frequency by Source:**
| Source | Frequency | Reason |
|--------|-----------|--------|
| Reddit (hot) | 5 min | Fast-moving |
| Hacker News | 10 min | Slower updates |
| Product Hunt | 30 min | Daily launches |
| YouTube | 1 hour | Quota conservation |
| NewsAPI | 15 min | Real-time news |
| RSS Feeds | 1 hour | Slower updates |
| Dev.to | 30 min | Moderate activity |

**Cron Jobs (Cloudflare Workers):**
```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    const source = event.cron // '*/5 * * * *' (every 5 minutes)

    if (source === '*/5 * * * *') {
      await pollReddit(env)
    } else if (source === '*/10 * * * *') {
      await pollHackerNews(env)
    }
    // ... more sources
  }
}
```

### 12.3 Data Storage

**D1 (SQLite) Schema:**
```sql
-- Content table
CREATE TABLE content (
  id TEXT PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  canonical_url TEXT,
  title TEXT,
  description TEXT,
  content_text TEXT,
  author TEXT,
  author_url TEXT,
  source TEXT, -- 'reddit', 'hackernews', etc.
  source_id TEXT,
  published_at TIMESTAMP,
  fetched_at TIMESTAMP,

  -- Metrics
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  engagement_rate REAL,

  -- Analysis
  sentiment REAL, -- -1 to 1
  keywords TEXT, -- JSON array
  topics TEXT, -- JSON array
  content_type TEXT, -- 'article', 'video', etc.

  -- SEO
  domain_authority INTEGER,

  INDEX idx_url (url),
  INDEX idx_canonical (canonical_url),
  INDEX idx_published (published_at),
  INDEX idx_source (source),
  INDEX idx_shares (shares)
);

-- Mentions table (brand monitoring)
CREATE TABLE mentions (
  id TEXT PRIMARY KEY,
  content_id TEXT REFERENCES content(id),
  keyword TEXT,
  context TEXT, -- Surrounding text
  sentiment REAL,
  reach INTEGER, -- Author follower count
  created_at TIMESTAMP,

  INDEX idx_keyword (keyword),
  INDEX idx_created (created_at)
);

-- Alerts table
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  conditions TEXT, -- JSON
  delivery TEXT, -- JSON (webhook, email, etc.)
  throttle_minutes INTEGER,
  last_triggered TIMESTAMP,
  enabled BOOLEAN DEFAULT TRUE
);
```

**R2 Storage:**
- Full HTML content (archived)
- Images (screenshots, thumbnails)
- Videos (metadata only, not files)
- User-uploaded data

### 12.4 Content Deduplication

**Algorithm:**
1. **URL Normalization:**
   ```python
   def normalize_url(url):
       parsed = urlparse(url)
       # Remove query params (except important ones)
       query = parse_qs(parsed.query)
       keep_params = ['id', 'v', 'p']  # YouTube video ID, pagination, etc.
       filtered_query = {k: v for k, v in query.items() if k in keep_params}

       normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
       if filtered_query:
           normalized += '?' + urlencode(filtered_query)
       return normalized.lower().rstrip('/')
   ```

2. **Canonical URL Extraction:**
   ```python
   from bs4 import BeautifulSoup

   def extract_canonical(html):
       soup = BeautifulSoup(html, 'html.parser')
       canonical = soup.find('link', rel='canonical')
       if canonical:
           return canonical['href']

       og_url = soup.find('meta', property='og:url')
       if og_url:
           return og_url['content']

       return None
   ```

3. **Content Fingerprinting:**
   ```python
   import hashlib

   def content_fingerprint(text):
       # Normalize: lowercase, remove punctuation, extra spaces
       normalized = re.sub(r'[^\w\s]', '', text.lower())
       normalized = re.sub(r'\s+', ' ', normalized).strip()

       # Simhash (locality-sensitive hashing)
       return hashlib.sha256(normalized.encode()).hexdigest()[:16]
   ```

4. **Duplicate Detection:**
   ```python
   def is_duplicate(new_content, existing_contents):
       new_fingerprint = content_fingerprint(new_content['text'])

       for existing in existing_contents:
           existing_fingerprint = content_fingerprint(existing['text'])

           # Hamming distance (number of differing bits)
           distance = bin(int(new_fingerprint, 16) ^ int(existing_fingerprint, 16)).count('1')

           if distance < 10:  # Threshold (0-10 = very similar)
               return True, existing['id']

       return False, None
   ```

### 12.5 Search Indexing

**Options:**
1. **Typesense (Recommended):**
   - Open source, easy to deploy
   - Typo tolerance, faceted search
   - Semantic search with embeddings
   - $0 (self-hosted) or $0.034/hr on Typesense Cloud

2. **Elasticsearch:**
   - Industry standard, powerful
   - Complex setup, resource-intensive
   - $16/mo+ (Elastic Cloud)

3. **D1 Full-Text Search:**
   - Built-in FTS5 (SQLite full-text search)
   - Limited features, good for MVP
   - No additional cost

**Typesense Schema:**
```typescript
const contentSchema = {
  name: 'content',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'content_text', type: 'string' },
    { name: 'author', type: 'string', facet: true },
    { name: 'source', type: 'string', facet: true },
    { name: 'topics', type: 'string[]', facet: true },
    { name: 'published_at', type: 'int64', sort: true },
    { name: 'shares', type: 'int32', sort: true },
    { name: 'sentiment', type: 'float' },
    { name: 'embedding', type: 'float[]', num_dim: 384 }, // Semantic search
  ],
  default_sorting_field: 'published_at'
}
```

**Search API:**
```typescript
const searchResults = await typesense.collections('content').documents().search({
  q: 'artificial intelligence',
  query_by: 'title,description,content_text',
  filter_by: 'source:reddit && shares:>50',
  sort_by: 'shares:desc',
  per_page: 20
})
```

### 12.6 Real-Time Streaming

**Reddit WebSocket (Alternative to Polling):**
- Use Reddit's PushShift or third-party stream
- Lower latency (<1 second vs. 5 minutes)
- More complex implementation

**Twitter Streaming API (if using Twitter):**
```typescript
const stream = client.v2.stream('tweets/search/stream', {
  'tweet.fields': ['author_id', 'created_at', 'public_metrics'],
  'expansions': ['author_id']
})

stream.on('data', async (tweet) => {
  if (matchesKeywords(tweet.data.text)) {
    await storeMention(tweet)
    await checkAlerts(tweet)
  }
})
```

**Recommendation:** Start with polling (simpler), add streaming in Phase 2

---

## 13. Privacy, Legal & Compliance

### 13.1 Web Scraping Legality

**hiQ Labs v. LinkedIn Precedent (2022):**
- **Outcome:** LinkedIn obtained permanent injunction against hiQ, BUT previous Ninth Circuit rulings remain valid
- **Key Ruling:** Public data scraping NOT covered by Computer Fraud and Abuse Act (CFAA)
- **Implication:** Platforms cannot use CFAA to block scraping of publicly available data

**Legal Framework:**
- ✅ **CFAA:** Does NOT apply to public data (no "unauthorized access")
- ⚠️ **Breach of Contract:** Terms of Service (ToS) can prohibit scraping (contract-based claims)
- ⚠️ **Trespass to Chattels:** Excessive scraping causing server harm (rare)

**Best Practices:**
1. **Respect robots.txt** (not legally binding, but ethical)
2. **Rate limiting** (avoid server overload)
3. **Use official APIs** when available (safer legally)
4. **Don't circumvent technical barriers** (authentication, CAPTCHAs)
5. **No personal data** (GDPR/CCPA compliance)

### 13.2 API Terms of Service

**Reddit API:**
- Commercial use allowed with OAuth
- Respect rate limits
- No reselling raw Reddit data

**Twitter/X API:**
- Strict terms, frequent changes
- Display attribution requirements
- No unauthorized use of tweets

**YouTube API:**
- Free tier for non-commercial apps
- Commercial use requires quota audit
- No downloading videos (metadata only)

**NewsAPI:**
- Free tier = development only
- Paid tier = commercial use
- Attribution required

**Recommendation:** Review ToS for each API, consult legal counsel

### 13.3 GDPR Compliance (EU Users)

**Scope:**
- Applies if processing EU residents' data
- Even if company is outside EU

**Requirements:**
1. **Lawful Basis:** Legitimate interest (monitoring public data)
2. **Data Minimization:** Only collect necessary data
3. **Transparency:** Privacy policy explaining data use
4. **User Rights:**
   - Right to access (export data)
   - Right to deletion (delete account + data)
   - Right to rectification (correct data)
5. **Data Security:** Encryption, access controls

**Personal Data in Our Context:**
- Public social media posts (usernames, content)
- User accounts (email, preferences)
- Alert recipients (email, phone)

**Mitigation:**
- Don't store IP addresses, device IDs
- Pseudonymize usernames where possible
- Clear privacy policy + cookie consent
- Data retention limits (auto-delete old data)

### 13.4 CCPA Compliance (California Users)

**Scope:**
- Applies if processing California residents' data
- Threshold: $25M+ revenue OR 50K+ consumers (we're likely below threshold initially)

**Requirements (if applicable):**
1. **Privacy Policy:** Disclose data collection practices
2. **Do Not Sell:** Opt-out mechanism (we don't sell data)
3. **Data Deletion:** Delete upon request
4. **Non-Discrimination:** Can't charge more for privacy rights

**Our Compliance:**
- Clear privacy policy
- No data selling
- Account deletion feature
- Email for privacy requests

### 13.5 Content Copyright

**Issue:** Are we storing copyrighted content?

**Analysis:**
- **Fair Use:** Likely yes (search engine, news aggregation)
- **Linking:** Safe (not copying, just linking)
- **Snippets:** Fair use (transformative, limited excerpt)
- **Full Content Storage:** Gray area (archive in R2, not redistributed)

**Best Practices:**
1. **Link to original source** (primary UX)
2. **Store metadata** (title, description, URL)
3. **Archive full content** for search indexing (not displayed)
4. **DMCA Policy:** Respond to takedown requests (safe harbor)

**DMCA Safe Harbor:**
- Designate DMCA agent (register with USPTO)
- Respond to takedown notices within 24-48 hours
- Remove infringing content promptly

### 13.6 Attribution & Branding

**Requirements:**
- Reddit: "Data via Reddit API"
- Twitter: "Tweets via Twitter API" + logo
- YouTube: "Video via YouTube API" + logo

**Implementation:**
- Display source logo/name with each content item
- "Powered by" footer/badge on search results
- API documentation includes attribution examples

---

## 14. Implementation Roadmap

### Phase 1: MVP (Weeks 1-4) - Free Data Sources

**Objective:** Launch basic content discovery with free APIs

**Features:**
- ✅ Reddit API integration (trending posts)
- ✅ Hacker News API (top/new stories)
- ✅ Product Hunt API (daily launches)
- ✅ Dev.to API (trending dev content)
- ✅ YouTube API (trending videos)
- ✅ Lobsters (tech content)
- ✅ Basic trending algorithm (velocity + engagement)
- ✅ D1 database (content storage)
- ✅ API endpoints (REST API for content search)
- ✅ Simple web dashboard (search, filters)

**Infrastructure:**
- Cloudflare Workers (API + cron jobs)
- D1 (SQLite database)
- R2 (content archive)

**Cost:** $27/mo (Cloudflare)

**Deliverable:** Public API + web dashboard, free tier (100 searches/day)

---

### Phase 2: Brand Monitoring (Weeks 5-8) - NewsAPI + Alerts

**Objective:** Add brand mention tracking and real-time alerts

**Features:**
- ✅ NewsAPI integration (150K news sources)
- ✅ RSS feed aggregation (blogs, podcasts)
- ✅ Keyword monitoring (brand names, competitors)
- ✅ Sentiment analysis (VADER, basic)
- ✅ Alert engine (webhook, email, Slack)
- ✅ Share count aggregation (Reddit, Pinterest, HN)
- ✅ User accounts (signup, API keys)
- ✅ Paid tiers (Starter $29, Growth $79)

**Infrastructure:**
- + NewsAPI subscription ($220/mo)
- + Typesense (search indexing, $0-50/mo)
- + SendGrid (email alerts, $0-20/mo)

**Cost:** $317/mo

**Deliverable:** Brand monitoring dashboard, alert system, paid subscriptions

---

### Phase 3: Advanced Features (Weeks 9-12) - AI + Influencers

**Objective:** Differentiate with AI enrichment and influencer discovery

**Features:**
- ✅ Twitter API integration (optional, $200/mo)
- ✅ Influencer discovery (engagement rate, follower count)
- ✅ AI summarization (GPT-4 for high-share content)
- ✅ Advanced sentiment (Google NLP for accuracy)
- ✅ Keyword extraction (RAKE, TF-IDF)
- ✅ Content gap analysis (competitor tracking)
- ✅ Historical trending ("On This Day")
- ✅ White-label API (Pro tier)
- ✅ Webhooks for real-time data
- ✅ Dashboard v2 (charts, analytics)

**Infrastructure:**
- + Twitter API ($200/mo, optional)
- + OpenAI API ($50/mo)
- + Google NLP API ($10/mo)

**Cost:** $577/mo (all features)

**Deliverable:** Full-featured platform competitive with BuzzSumo/Brand24

---

### Phase 4: Scale & Optimize (Months 4-6)

**Objective:** Improve performance, add enterprise features

**Features:**
- ✅ Elasticsearch migration (better search)
- ✅ Real-time streaming (Twitter, Reddit WebSocket)
- ✅ TikTok scraping (unofficial API)
- ✅ Podcast transcription (Whisper API)
- ✅ Image analysis (logos, faces)
- ✅ Backlink tracking (Ahrefs/Moz integration)
- ✅ Custom data sources (user-provided RSS, APIs)
- ✅ Multi-language support (14+ languages via NewsAPI)
- ✅ Enterprise tier ($299/mo, SLA, support)

**Infrastructure:**
- Elastic Cloud or self-hosted (cost optimization)
- Horizontal scaling (multiple Workers)
- CDN for dashboard (Cloudflare Pages)

**Cost:** Optimize to <$1K/mo for 100K+ articles/day

**Deliverable:** Enterprise-ready platform, 1K+ paying customers

---

## 15. Competitive Advantages

### 15.1 Why We'll Win

**1. API-First Approach:**
- Competitors are dashboard-first (API is Enterprise-only add-on)
- We offer API access at ALL tiers (even Free)
- Developer-friendly documentation (Postman collections, code examples)

**2. Transparent Pricing:**
- No "Contact Sales" BS
- Clear feature matrix
- Self-serve signup and billing

**3. Free Tier:**
- BuzzSumo, Mention, Brand24 have NO free tier
- Our free tier: 100 tracked keywords, 1K mentions/mo, API access
- Acquisition funnel: free → paid upgrades

**4. 50-70% Cheaper:**
- Starter: $29 vs. Mention $41 (29% cheaper)
- Growth: $79 vs. Brand24 $99 (20% cheaper)
- Pro: $149 vs. BuzzSumo $199 (25% cheaper)
- Enterprise: $299 vs. BuzzSumo $499 (40% cheaper)

**5. More Data Sources:**
- Competitors focus on Twitter + news (expensive)
- We use free sources (Reddit, HN, YouTube, Dev.to)
- Reddit + Hacker News = tech/startup gold mine (underutilized)

**6. Real-Time Alerts:**
- Competitors: hourly or daily digests
- Us: Real-time (5-15 minute polling, WebSocket streaming in Phase 2)

**7. Open Architecture:**
- Webhooks for custom integrations
- Export data (JSON, CSV)
- No vendor lock-in

**8. Semantic Search (Phase 3):**
- Typesense with sentence embeddings
- Search by meaning, not just keywords
- "Find content about X" (more intuitive)

### 15.2 What We Won't Have (Initially)

**BuzzSumo Advantages:**
- Years of historical share count data (we start from zero)
- Proprietary influencer database (we build ours)
- Facebook share counts (API deprecated, we can't access)
- Brand recognition (they've been around since 2012)

**Mention Advantages:**
- Social media management tools (posting, scheduling)
- 1 billion sources (we start with ~200K via NewsAPI + Reddit)

**Brand24 Advantages:**
- Real-time PDF reports
- Dedicated account managers (Enterprise)

**Our Mitigation:**
- Focus on developers and startups (they prefer API, don't need hand-holding)
- Build historical data over time (in 1 year, we'll have 1 year of history)
- Partner with Moz/Ahrefs for backlink data (affiliate or API integration)

---

## 16. Go-To-Market Strategy

### 16.1 Target Customers

**Primary:**
- **Indie Makers / Solo Founders:** Building SaaS products, need brand monitoring on a budget
- **Content Marketers:** Need content ideas, competitor analysis, trending topics
- **Agencies:** Managing multiple clients' brands, need white-label API
- **Developer Tools Companies:** API-first users, integrate into dashboards
- **Crypto/Web3 Projects:** High Reddit/Twitter presence, need real-time monitoring

**Secondary:**
- **E-commerce Brands:** Monitor product mentions, reviews
- **B2B SaaS:** Track industry trends, competitor news
- **PR Firms:** Media monitoring, crisis management

### 16.2 Marketing Channels

**1. Product Hunt Launch:**
- Build in public (Twitter, Indie Hackers)
- Launch on Product Hunt (we're already tracking it!)
- Offer lifetime deals for early supporters

**2. Developer Communities:**
- Reddit: /r/SideProject, /r/startups, /r/Entrepreneur, /r/marketing
- Hacker News: Show HN post
- Dev.to: Write tutorial "Building a content monitoring API"
- Indie Hackers: Case study, revenue dashboard

**3. SEO Content:**
- "BuzzSumo Alternative"
- "Best Brand Monitoring Tools 2025"
- "How to Track Brand Mentions for Free"
- "Reddit API Tutorial for Marketers"

**4. API Marketplace Listings:**
- RapidAPI
- APIs.guru
- ProgrammableWeb

**5. Affiliate Program:**
- 20% recurring commission
- Target: marketing bloggers, YouTubers
- Provide API integration tutorials

**6. Integrations:**
- Zapier (connect to 5,000+ apps)
- Make.com (formerly Integromat)
- Slack (direct app listing)
- Discord (bot integration)

### 16.3 Pricing Experiments

**Lifetime Deals (Launch Only):**
- $99 = Starter tier (lifetime)
- $249 = Growth tier (lifetime)
- $499 = Pro tier (lifetime)
- Limit: 500 lifetime licenses total
- Goal: Generate $25K-50K initial capital

**Freemium Conversion Funnel:**
- Free tier → 10% convert to Starter after 30 days
- Starter → 20% upgrade to Growth after 90 days
- Growth → 10% upgrade to Pro after 1 year

**Annual Billing Discount:**
- 20% off (2 months free)
- Improves cash flow, reduces churn

---

## Conclusion

This research provides a comprehensive foundation for building a content discovery and brand monitoring platform that can compete with BuzzSumo ($199-499/mo), Mention ($41-149/mo), and Brand24 ($199-599/mo) at a **50-70% lower price point** while offering **superior API access** and **more diverse data sources**.

**Key Takeaways:**
1. **Free APIs (Reddit, HN, Product Hunt, YouTube) provide substantial value** at zero cost
2. **NewsAPI ($220/mo) is the only significant data cost** for Phase 1-2
3. **Twitter API ($200+/mo) is optional** — start without it
4. **hiQ v. LinkedIn precedent supports public data scraping** (not covered by CFAA)
5. **Cloudflare infrastructure** keeps costs low (<$500/mo for 100K articles/day)
6. **API-first approach and transparent pricing** are competitive differentiators
7. **Target market: developers, indie makers, startups** (underserved by expensive incumbents)

**Next Steps:**
1. Review this document with stakeholders
2. Prioritize features for MVP (Phase 1)
3. Set up Cloudflare Workers + D1 + R2 infrastructure
4. Implement Reddit, Hacker News, Product Hunt APIs
5. Build basic trending algorithm
6. Launch free tier + API docs
7. Gather user feedback
8. Iterate and expand to Phase 2 (NewsAPI + alerts)

**Estimated Timeline:**
- Phase 1 (MVP): 4 weeks
- Phase 2 (Brand Monitoring): 4 weeks
- Phase 3 (Advanced Features): 4 weeks
- Phase 4 (Scale): Ongoing

**Total Time to Launch:** 12 weeks (3 months)

---

**Document Version:** 1.0
**Last Updated:** October 3, 2025
**Author:** Claude (AI Research Assistant)
**Status:** Ready for Implementation
