-- Data Ingestion Platform - D1 Database Schema
-- Semi-structured storage: common fields + JSON data field

-- Enable JSON support
PRAGMA foreign_keys = ON;

-- ============================================================================
-- NPM/PyPI Packages
-- ============================================================================

CREATE TABLE packages (
  -- Primary key (namespace + id)
  ns TEXT NOT NULL,              -- 'npm' | 'pypi' | 'crates' | 'gem'
  id TEXT NOT NULL,              -- Package name

  -- Structured fields (frequently queried)
  name TEXT NOT NULL,
  version TEXT,                  -- Latest version
  description TEXT,
  author TEXT,
  license TEXT,
  homepage TEXT,
  repository TEXT,

  -- Metrics (indexed for sorting/filtering)
  downloads_total INTEGER DEFAULT 0,
  downloads_last_month INTEGER DEFAULT 0,
  downloads_last_week INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,

  -- Dates (stored as ISO 8601 strings)
  published_at TEXT,
  last_updated TEXT,

  -- Full package data (source-specific)
  data TEXT NOT NULL,            -- JSON string

  -- Dependencies (extracted for querying)
  dependencies TEXT,             -- JSON object {name: version}
  dev_dependencies TEXT,         -- JSON object
  peer_dependencies TEXT,        -- JSON object

  -- Search (comma-separated)
  keywords TEXT,
  tags TEXT,

  -- Metadata
  visibility TEXT DEFAULT 'public',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  PRIMARY KEY (ns, id)
);

CREATE INDEX packages_name_idx ON packages (name);
CREATE INDEX packages_author_idx ON packages (author);
CREATE INDEX packages_license_idx ON packages (license);
CREATE INDEX packages_downloads_idx ON packages (downloads_total DESC);
CREATE INDEX packages_published_idx ON packages (published_at DESC);
CREATE INDEX packages_ns_idx ON packages (ns);

-- Package versions (historical tracking)
CREATE TABLE package_versions (
  package_ns TEXT NOT NULL,
  package_id TEXT NOT NULL,
  version TEXT NOT NULL,
  published_at TEXT NOT NULL,
  downloads INTEGER DEFAULT 0,
  data TEXT NOT NULL,            -- JSON string

  PRIMARY KEY (package_ns, package_id, version),
  FOREIGN KEY (package_ns, package_id) REFERENCES packages(ns, id) ON DELETE CASCADE
);

CREATE INDEX package_versions_published_idx ON package_versions (published_at DESC);

-- ============================================================================
-- Email Patterns
-- ============================================================================

CREATE TABLE email_patterns (
  ns TEXT NOT NULL DEFAULT 'email',
  id TEXT NOT NULL,              -- domain name

  -- Structured fields
  domain TEXT NOT NULL UNIQUE,
  pattern TEXT NOT NULL,         -- "{first}.{last}@domain.com"

  -- Verification
  verified INTEGER DEFAULT 0,    -- Boolean (0 or 1)
  verified_at TEXT,
  verified_by TEXT,
  confidence REAL,               -- 0.00 to 1.00

  -- Sources (comma-separated)
  sources TEXT,                  -- 'hunter.io,clearbit,manual'
  sample_emails TEXT,            -- JSON array

  -- Organization link
  organization_id TEXT,
  employee_count INTEGER,

  -- Full data
  data TEXT NOT NULL,            -- JSON string

  -- Metadata
  visibility TEXT DEFAULT 'public',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  PRIMARY KEY (ns, id)
);

CREATE INDEX email_patterns_domain_idx ON email_patterns (domain);
CREATE INDEX email_patterns_org_idx ON email_patterns (organization_id);
CREATE INDEX email_patterns_verified_idx ON email_patterns (verified, confidence DESC);

-- ============================================================================
-- Organizations
-- ============================================================================

CREATE TABLE organizations (
  ns TEXT NOT NULL DEFAULT 'org',
  id TEXT NOT NULL,              -- Slug or unique ID

  -- Structured fields
  name TEXT NOT NULL,
  legal_name TEXT,
  domain TEXT UNIQUE,
  type TEXT,                     -- 'company' | 'nonprofit' | 'government'
  industry TEXT,

  -- Size and metrics
  employee_count INTEGER,
  revenue INTEGER,               -- Annual revenue in USD
  founded_year INTEGER,

  -- Location
  country TEXT,
  state TEXT,
  city TEXT,
  address TEXT,
  lat REAL,
  lng REAL,

  -- Social
  website TEXT,
  linkedin_url TEXT,
  twitter_handle TEXT,
  github_org TEXT,

  -- Org chart data (hierarchical)
  org_chart TEXT,                -- JSON structure

  -- People (references to users or separate people table)
  people TEXT,                   -- JSON array [{name, title, email, linkedin}]

  -- Full data
  data TEXT NOT NULL,            -- JSON string

  -- Metadata
  visibility TEXT DEFAULT 'public',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  PRIMARY KEY (ns, id)
);

CREATE INDEX organizations_domain_idx ON organizations (domain);
CREATE INDEX organizations_industry_idx ON organizations (industry);
CREATE INDEX organizations_country_idx ON organizations (country);
CREATE INDEX organizations_size_idx ON organizations (employee_count DESC);
CREATE INDEX organizations_name_idx ON organizations (name);

-- ============================================================================
-- Domains (Zone File Data)
-- ============================================================================

CREATE TABLE domains (
  ns TEXT NOT NULL DEFAULT 'domain',
  id TEXT NOT NULL,              -- Domain name (example.com)

  -- TLD
  tld TEXT NOT NULL,             -- Top-level domain

  -- DNS records (summary)
  nameservers TEXT,              -- JSON array
  mx_records TEXT,               -- JSON array
  a_records TEXT,                -- JSON array (IP addresses)
  aaaa_records TEXT,             -- JSON array (IPv6)
  txt_records TEXT,              -- JSON array

  -- DNSSEC
  dnssec_enabled INTEGER DEFAULT 0,  -- Boolean
  ds_records TEXT,               -- JSON array
  dnskey_records TEXT,           -- JSON array

  -- Registrar info
  registrar TEXT,
  registrar_id TEXT,

  -- Dates
  created_date TEXT,
  expiry_date TEXT,
  last_updated TEXT,

  -- Zone file storage (R2 path)
  zone_file_r2_key TEXT,
  zone_file_size INTEGER,
  zone_file_hash TEXT,           -- SHA-256

  -- Full data
  data TEXT NOT NULL,            -- JSON string

  -- Metadata
  visibility TEXT DEFAULT 'public',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  PRIMARY KEY (ns, id)
);

CREATE INDEX domains_tld_idx ON domains (tld);
CREATE INDEX domains_registrar_idx ON domains (registrar);
CREATE INDEX domains_expiry_idx ON domains (expiry_date);
CREATE INDEX domains_dnssec_idx ON domains (dnssec_enabled);

-- ============================================================================
-- WHOIS Records
-- ============================================================================

CREATE TABLE whois_records (
  ns TEXT NOT NULL DEFAULT 'whois',
  id TEXT NOT NULL,              -- Domain name

  -- Registrant (often redacted by GDPR)
  registrant_name TEXT,
  registrant_email TEXT,
  registrant_organization TEXT,
  registrant_country TEXT,
  registrant_state TEXT,
  registrant_city TEXT,

  -- Registrar
  registrar_name TEXT,
  registrar_id TEXT,
  registrar_url TEXT,
  registrar_abuse_email TEXT,
  registrar_abuse_phone TEXT,

  -- Dates
  created_date TEXT,
  updated_date TEXT,
  expiry_date TEXT,

  -- Nameservers (comma-separated)
  nameservers TEXT,

  -- Status codes (comma-separated)
  status_codes TEXT,             -- clientTransferProhibited,etc.

  -- DNSSEC
  dnssec TEXT,                   -- signedDelegation | unsigned

  -- Raw WHOIS text (for full data preservation)
  raw_whois TEXT,

  -- Parsed data
  data TEXT NOT NULL,            -- JSON string

  -- Metadata
  last_checked_at TEXT,
  visibility TEXT DEFAULT 'public',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  PRIMARY KEY (ns, id)
);

CREATE INDEX whois_registrant_email_idx ON whois_records (registrant_email);
CREATE INDEX whois_registrar_idx ON whois_records (registrar_name);
CREATE INDEX whois_expiry_idx ON whois_records (expiry_date);
CREATE INDEX whois_created_idx ON whois_records (created_date);

-- ============================================================================
-- Ingestion Metadata (tracking)
-- ============================================================================

CREATE TABLE ingestion_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,          -- 'npm' | 'pypi' | 'czds' | 'whois'
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
-- Queue Messages (dead letter queue)
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

-- View: Popular packages across all registries
CREATE VIEW popular_packages AS
SELECT
  ns,
  id,
  name,
  downloads_total,
  stars,
  license,
  published_at
FROM packages
WHERE downloads_total > 1000
ORDER BY downloads_total DESC;

-- View: Verified email patterns
CREATE VIEW verified_email_patterns AS
SELECT
  domain,
  pattern,
  confidence,
  sources,
  verified_at
FROM email_patterns
WHERE verified = 1
ORDER BY confidence DESC;

-- View: Expiring domains (next 30 days)
CREATE VIEW expiring_domains AS
SELECT
  id as domain,
  registrar_name,
  expiry_date,
  created_date,
  julianday(expiry_date) - julianday('now') as days_until_expiry
FROM whois_records
WHERE expiry_date IS NOT NULL
  AND julianday(expiry_date) BETWEEN julianday('now') AND julianday('now', '+30 days')
ORDER BY expiry_date;

-- View: Recent ingestion activity
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
