-- Minimal D1 Schema - Operational Metadata Only
-- All data stored in R2, D1 only tracks operational state

PRAGMA foreign_keys = ON;

-- ============================================================================
-- Ingestion Run Tracking (Small, frequently updated)
-- ============================================================================

CREATE TABLE ingestion_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,          -- 'npm' | 'pypi' | 'github' | 'czds' | 'whois' | 'email'
  run_type TEXT NOT NULL,        -- 'full_sync' | 'incremental' | 'on_demand'

  -- Metrics
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Timing
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,

  -- Status
  status TEXT NOT NULL,          -- 'running' | 'completed' | 'failed'
  error_message TEXT,

  -- Cursor (for incremental updates)
  cursor TEXT,                   -- NPM sequence, date, etc.

  -- Metadata
  data TEXT                      -- JSON string with run details
);

CREATE INDEX ingestion_runs_source_idx ON ingestion_runs (source, started_at DESC);
CREATE INDEX ingestion_runs_status_idx ON ingestion_runs (status);

-- ============================================================================
-- Sync State (Tiny, frequently read/written)
-- ============================================================================

CREATE TABLE sync_state (
  source TEXT PRIMARY KEY,       -- 'npm' | 'pypi' | 'github' | etc.
  last_sequence TEXT,            -- NPM: CouchDB sequence, PyPI: timestamp
  last_sync_time TEXT,           -- ISO 8601 timestamp
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- Failed Messages (For retry/debugging)
-- ============================================================================

CREATE TABLE failed_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_name TEXT NOT NULL,

  -- Message content
  message_body TEXT NOT NULL,    -- JSON string

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timing
  original_timestamp TEXT NOT NULL,
  failed_at TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'failed',  -- 'failed' | 'resolved' | 'ignored'
  resolved_at TEXT
);

CREATE INDEX failed_messages_queue_idx ON failed_messages (queue_name, failed_at DESC);
CREATE INDEX failed_messages_status_idx ON failed_messages (status);

-- ============================================================================
-- Helper Views
-- ============================================================================

-- Recent ingestion activity
CREATE VIEW recent_ingestion_activity AS
SELECT
  source,
  run_type,
  records_processed,
  records_inserted,
  records_updated,
  status,
  started_at,
  duration_ms
FROM ingestion_runs
ORDER BY started_at DESC
LIMIT 100;

-- Active ingestion runs
CREATE VIEW active_runs AS
SELECT
  id,
  source,
  run_type,
  records_processed,
  started_at,
  CAST((julianday('now') - julianday(started_at)) * 86400 AS INTEGER) as running_seconds
FROM ingestion_runs
WHERE status = 'running'
ORDER BY started_at;

-- Failed runs (last 24 hours)
CREATE VIEW recent_failures AS
SELECT
  source,
  run_type,
  error_message,
  started_at,
  records_processed
FROM ingestion_runs
WHERE status = 'failed'
  AND julianday('now') - julianday(started_at) < 1
ORDER BY started_at DESC;
