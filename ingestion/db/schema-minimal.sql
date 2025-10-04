-- Data Ingestion Platform - Minimal D1 Schema
-- Only operational metadata (ingestion tracking, sync state)
-- All data stored in R2 + R2 SQL

PRAGMA foreign_keys = ON;

-- ============================================================================
-- Ingestion Runs (Operational Tracking)
-- ============================================================================

CREATE TABLE ingestion_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,          -- 'npm' | 'pypi' | 'czds' | 'whois' | 'github' | 'email' | 'org'
  run_type TEXT NOT NULL,        -- 'full_sync' | 'incremental' | 'on_demand'

  -- Metrics
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  bytes_written INTEGER DEFAULT 0,

  -- Timing
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,

  -- Status
  status TEXT NOT NULL,          -- 'running' | 'completed' | 'failed'
  error_message TEXT,

  -- Cursor/position for incremental updates
  cursor TEXT,                   -- NPM sequence, PyPI timestamp, etc.

  -- R2 storage references
  r2_bucket TEXT,                -- Which R2 bucket
  r2_prefix TEXT,                -- Path prefix in bucket

  -- Metadata
  data TEXT                      -- JSON string with run details
);

CREATE INDEX ingestion_runs_source_idx ON ingestion_runs (source, started_at DESC);
CREATE INDEX ingestion_runs_status_idx ON ingestion_runs (status);

-- ============================================================================
-- Sync State (Last successful positions)
-- ============================================================================

CREATE TABLE sync_state (
  source TEXT PRIMARY KEY,       -- 'npm' | 'pypi' | etc.

  -- Position tracking
  last_sequence TEXT,            -- NPM sequence number
  last_timestamp TEXT,           -- Last sync timestamp (ISO 8601)
  last_cursor TEXT,              -- Generic cursor

  -- Stats
  total_records INTEGER DEFAULT 0,
  last_sync_at TEXT,
  last_sync_duration_ms INTEGER,

  -- Metadata
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- Failed Messages (Dead Letter Queue)
-- ============================================================================

CREATE TABLE failed_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_name TEXT NOT NULL,

  -- Message content
  message_body TEXT NOT NULL,    -- JSON string
  message_id TEXT,               -- Original queue message ID

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timing
  original_timestamp TEXT NOT NULL,
  failed_at TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'failed',  -- 'failed' | 'resolved' | 'ignored' | 'retrying'
  resolved_at TEXT,

  -- R2 storage (if message was partially processed)
  r2_key TEXT
);

CREATE INDEX failed_messages_queue_idx ON failed_messages (queue_name, failed_at DESC);
CREATE INDEX failed_messages_status_idx ON failed_messages (status);

-- ============================================================================
-- R2 Partitions Index (Optional - helps with querying)
-- ============================================================================

CREATE TABLE r2_partitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Partition metadata
  source TEXT NOT NULL,          -- 'npm' | 'pypi' | etc.
  partition_key TEXT NOT NULL,   -- Date or batch identifier

  -- R2 storage
  r2_bucket TEXT NOT NULL,
  r2_key TEXT NOT NULL,          -- Full path to Parquet file

  -- Stats
  record_count INTEGER DEFAULT 0,
  file_size_bytes INTEGER DEFAULT 0,

  -- Time range covered by partition
  time_start TEXT,
  time_end TEXT,

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),

  UNIQUE (source, partition_key)
);

CREATE INDEX r2_partitions_source_idx ON r2_partitions (source, partition_key);
CREATE INDEX r2_partitions_time_idx ON r2_partitions (time_start, time_end);

-- ============================================================================
-- API Keys (If using self-hosted auth)
-- ============================================================================

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,           -- UUID
  key_hash TEXT NOT NULL UNIQUE, -- bcrypt hash of API key

  -- Metadata
  name TEXT,
  description TEXT,

  -- Permissions
  scopes TEXT,                   -- Comma-separated: 'read', 'write', 'admin'

  -- Rate limiting
  rate_limit_per_hour INTEGER DEFAULT 1000,

  -- Status
  enabled INTEGER DEFAULT 1,

  -- Tracking
  last_used_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE INDEX api_keys_hash_idx ON api_keys (key_hash);

-- ============================================================================
-- Views
-- ============================================================================

-- View: Recent ingestion activity
CREATE VIEW recent_ingestion_activity AS
SELECT
  source,
  run_type,
  records_processed,
  records_inserted,
  records_updated,
  records_failed,
  bytes_written,
  status,
  started_at,
  completed_at,
  duration_ms,
  r2_prefix
FROM ingestion_runs
ORDER BY started_at DESC
LIMIT 100;

-- View: Active sync state
CREATE VIEW active_sync_state AS
SELECT
  source,
  last_sequence,
  last_timestamp,
  total_records,
  last_sync_at,
  last_sync_duration_ms,
  -- Calculate records per second
  CASE
    WHEN last_sync_duration_ms > 0
    THEN CAST(total_records AS REAL) / (last_sync_duration_ms / 1000.0)
    ELSE 0
  END as records_per_second
FROM sync_state
ORDER BY last_sync_at DESC;

-- View: Failed message summary
CREATE VIEW failed_message_summary AS
SELECT
  queue_name,
  status,
  COUNT(*) as count,
  MAX(failed_at) as last_failure
FROM failed_messages
GROUP BY queue_name, status;
