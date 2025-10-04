-- Lead Enrichment API Database Schema
-- Cloudflare D1 (SQLite)

-- ============================================================================
-- API Keys Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- api_live_ or api_test_
  tier TEXT NOT NULL CHECK(tier IN ('free', 'starter', 'growth', 'pro')),
  rate_limit_rpm INTEGER NOT NULL DEFAULT 60,
  rate_limit_rpd INTEGER NOT NULL DEFAULT 10000,
  credits_limit INTEGER NOT NULL DEFAULT 1000,
  credits_used INTEGER NOT NULL DEFAULT 0,
  credits_reset_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  expires_at TEXT,
  revoked BOOLEAN NOT NULL DEFAULT 0
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_tier ON api_keys(tier);
CREATE INDEX idx_api_keys_revoked ON api_keys(revoked) WHERE revoked = 0;

-- ============================================================================
-- Enrichment Cache Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS enrichment_cache (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('person', 'company')),
  input_key TEXT NOT NULL, -- email, domain, or github_username
  enriched_data TEXT NOT NULL, -- JSON blob
  confidence_score REAL NOT NULL,
  data_sources TEXT NOT NULL, -- JSON array of sources
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL, -- TTL: 7 days default
  credits_used INTEGER NOT NULL DEFAULT 1,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TEXT
);

CREATE INDEX idx_enrichment_cache_input ON enrichment_cache(input_key);
CREATE INDEX idx_enrichment_cache_type ON enrichment_cache(type);
CREATE INDEX idx_enrichment_cache_expires ON enrichment_cache(expires_at);
CREATE INDEX idx_enrichment_cache_confidence ON enrichment_cache(confidence_score);

-- ============================================================================
-- Usage Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_id TEXT NOT NULL,
  input_data TEXT, -- JSON blob of request
  response_status INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  cache_hit BOOLEAN NOT NULL DEFAULT 0,
  confidence_score REAL,
  data_sources TEXT, -- JSON array
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_usage_logs_api_key ON usage_logs(api_key_id);
CREATE INDEX idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_endpoint ON usage_logs(endpoint);
CREATE INDEX idx_usage_logs_cache_hit ON usage_logs(cache_hit);

-- ============================================================================
-- Rate Limit Counters Table
-- ============================================================================
-- Note: This is backup for KV. Primary rate limiting uses KV for speed.

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  counter_type TEXT NOT NULL CHECK(counter_type IN ('minute', 'day')),
  count INTEGER NOT NULL DEFAULT 1,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rate_limit_api_key ON rate_limit_counters(api_key_id);
CREATE INDEX idx_rate_limit_window ON rate_limit_counters(window_start, window_end);
CREATE INDEX idx_rate_limit_type ON rate_limit_counters(counter_type);

-- ============================================================================
-- Failed Requests Table (for debugging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS failed_requests (
  id TEXT PRIMARY KEY,
  api_key_id TEXT,
  user_id TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_id TEXT NOT NULL,
  input_data TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  resolved BOOLEAN NOT NULL DEFAULT 0
);

CREATE INDEX idx_failed_requests_created ON failed_requests(created_at);
CREATE INDEX idx_failed_requests_error_type ON failed_requests(error_type);
CREATE INDEX idx_failed_requests_resolved ON failed_requests(resolved) WHERE resolved = 0;

-- ============================================================================
-- System Status Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_status (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Initialize system status
INSERT OR IGNORE INTO system_status (key, value) VALUES
  ('api_status', 'operational'),
  ('version', '1.0.0'),
  ('last_deployment', datetime('now')),
  ('total_requests', '0'),
  ('total_enrichments', '0'),
  ('cache_hit_rate', '0.0');

-- ============================================================================
-- Data Source Health Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_source_health (
  source TEXT PRIMARY KEY CHECK(source IN ('github_profile', 'github_commits', 'github_repos', 'github_org', 'whois')),
  status TEXT NOT NULL CHECK(status IN ('operational', 'degraded', 'down')),
  last_check TEXT NOT NULL DEFAULT (datetime('now')),
  last_success TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  total_records INTEGER NOT NULL DEFAULT 0,
  last_update TEXT
);

-- Initialize data sources
INSERT OR IGNORE INTO data_source_health (source, status, last_check) VALUES
  ('github_profile', 'operational', datetime('now')),
  ('github_commits', 'operational', datetime('now')),
  ('github_repos', 'operational', datetime('now')),
  ('github_org', 'operational', datetime('now')),
  ('whois', 'operational', datetime('now'));

-- ============================================================================
-- Views for Reporting
-- ============================================================================

-- API Key Usage Summary
CREATE VIEW IF NOT EXISTS v_api_key_usage AS
SELECT
  ak.id,
  ak.user_id,
  ak.tier,
  ak.credits_limit,
  ak.credits_used,
  ak.credits_limit - ak.credits_used AS credits_remaining,
  COUNT(ul.id) AS total_requests,
  SUM(CASE WHEN ul.cache_hit = 1 THEN 1 ELSE 0 END) AS cache_hits,
  SUM(CASE WHEN ul.cache_hit = 0 THEN 1 ELSE 0 END) AS cache_misses,
  CAST(SUM(CASE WHEN ul.cache_hit = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(ul.id) AS cache_hit_rate,
  AVG(ul.response_time_ms) AS avg_response_time_ms,
  AVG(ul.confidence_score) AS avg_confidence_score,
  MAX(ul.created_at) AS last_request_at
FROM api_keys ak
LEFT JOIN usage_logs ul ON ul.api_key_id = ak.id
WHERE ak.revoked = 0
GROUP BY ak.id;

-- Daily Usage Stats
CREATE VIEW IF NOT EXISTS v_daily_usage AS
SELECT
  date(created_at) AS date,
  COUNT(*) AS total_requests,
  SUM(credits_used) AS total_credits,
  SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) AS cache_hits,
  SUM(CASE WHEN cache_hit = 0 THEN 1 ELSE 0 END) AS cache_misses,
  AVG(response_time_ms) AS avg_response_time_ms,
  AVG(confidence_score) AS avg_confidence_score,
  COUNT(DISTINCT api_key_id) AS unique_api_keys,
  COUNT(DISTINCT user_id) AS unique_users
FROM usage_logs
GROUP BY date(created_at)
ORDER BY date DESC;

-- Endpoint Performance
CREATE VIEW IF NOT EXISTS v_endpoint_performance AS
SELECT
  endpoint,
  method,
  COUNT(*) AS total_requests,
  AVG(response_time_ms) AS avg_response_time_ms,
  MIN(response_time_ms) AS min_response_time_ms,
  MAX(response_time_ms) AS max_response_time_ms,
  SUM(CASE WHEN response_status >= 200 AND response_status < 300 THEN 1 ELSE 0 END) AS success_count,
  SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) AS error_count,
  CAST(SUM(CASE WHEN response_status >= 200 AND response_status < 300 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) AS success_rate
FROM usage_logs
GROUP BY endpoint, method
ORDER BY total_requests DESC;
