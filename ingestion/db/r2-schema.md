# R2 Storage Schema

**Primary Storage:** All data stored in R2 buckets using structured directories and files.

**Query Interface:** R2 SQL for querying data directly from R2.

## R2 Bucket Structure

```
data-ingestion/
├── npm/                          # NPM packages
│   ├── metadata/                 # Package metadata (JSON)
│   │   ├── 2024/01/01/
│   │   │   ├── express.json
│   │   │   ├── react.json
│   │   │   └── ...
│   │   └── partitions.parquet/   # Partitioned Parquet files
│   │       ├── year=2024/
│   │       │   ├── month=01/
│   │       │   │   └── data.parquet
│   │       │   └── month=02/
│   │       └── ...
│   └── raw/                      # Raw package data
│       ├── express/
│       │   └── latest.json
│       └── ...
│
├── pypi/                         # PyPI packages
│   ├── metadata/
│   │   └── partitions.parquet/
│   └── raw/
│
├── github/                       # GitHub data
│   ├── profiles/                 # User profiles
│   │   └── partitions.parquet/
│   ├── repos/                    # Repository data
│   │   └── partitions.parquet/
│   ├── commits/                  # Commit data (emails)
│   │   └── partitions.parquet/
│   └── raw/
│
├── email-patterns/               # Email patterns
│   ├── metadata/
│   │   └── partitions.parquet/
│   └── raw/
│
├── organizations/                # Organization data
│   ├── metadata/
│   │   └── partitions.parquet/
│   └── raw/
│
├── zones/                        # DNS zone files
│   ├── tld=com/
│   │   ├── example.com.zone
│   │   ├── google.com.zone
│   │   └── ...
│   ├── tld=org/
│   └── metadata/
│       └── partitions.parquet/
│
├── whois/                        # WHOIS records
│   ├── metadata/
│   │   └── partitions.parquet/
│   └── raw/
│
└── catalog/                      # Data Catalog metadata
    ├── schemas/
    ├── indexes/
    └── partitions/
```

## Parquet Schema for NPM Packages

```parquet
message npm_package {
  required binary name (UTF8);
  optional binary version (UTF8);
  optional binary description (UTF8);
  optional binary author (UTF8);
  optional binary license (UTF8);
  optional binary homepage (UTF8);
  optional binary repository (UTF8);

  optional int64 downloads_total;
  optional int64 downloads_last_month;
  optional int64 stars;
  optional int64 forks;

  optional binary published_at (UTF8);
  optional binary last_updated (UTF8);

  optional binary keywords (UTF8);  // comma-separated
  optional binary tags (UTF8);

  optional binary dependencies (UTF8);      // JSON string
  optional binary dev_dependencies (UTF8);  // JSON string
  optional binary peer_dependencies (UTF8); // JSON string

  optional binary data (UTF8);              // Full JSON data

  optional binary created_at (UTF8);
  optional binary updated_at (UTF8);
}
```

## Parquet Schema for PyPI Packages

```parquet
message pypi_package {
  required binary name (UTF8);
  optional binary version (UTF8);
  optional binary description (UTF8);
  optional binary author (UTF8);
  optional binary license (UTF8);
  optional binary homepage (UTF8);
  optional binary repository (UTF8);

  optional int64 downloads_total;
  optional int64 downloads_last_month;

  optional binary published_at (UTF8);
  optional binary last_updated (UTF8);

  optional binary keywords (UTF8);
  optional binary classifiers (UTF8);  // JSON array

  optional binary requires_dist (UTF8);  // JSON array

  optional binary data (UTF8);

  optional binary created_at (UTF8);
  optional binary updated_at (UTF8);
}
```

## Parquet Schema for GitHub Profiles

```parquet
message github_profile {
  required binary username (UTF8);
  optional binary email (UTF8);
  optional binary name (UTF8);
  optional binary company (UTF8);
  optional binary location (UTF8);
  optional binary bio (UTF8);
  optional binary blog (UTF8);
  optional binary twitter (UTF8);

  optional int32 public_repos;
  optional int32 followers;
  optional int32 following;

  optional binary created_at (UTF8);
  optional binary updated_at (UTF8);

  optional binary data (UTF8);  // Full JSON
}
```

## Parquet Schema for GitHub Commits

```parquet
message github_commit {
  required binary sha (UTF8);
  required binary repo (UTF8);

  optional binary author_name (UTF8);
  optional binary author_email (UTF8);
  optional binary author_date (UTF8);

  optional binary committer_name (UTF8);
  optional binary committer_email (UTF8);
  optional binary committer_date (UTF8);

  optional binary message (UTF8);

  optional binary data (UTF8);  // Full JSON

  optional binary created_at (UTF8);
}
```

## Parquet Schema for Email Patterns

```parquet
message email_pattern {
  required binary domain (UTF8);
  required binary pattern (UTF8);

  optional float confidence;
  optional boolean verified;
  optional binary verified_at (UTF8);
  optional binary verified_by (UTF8);

  optional binary sources (UTF8);        // comma-separated
  optional binary sample_emails (UTF8);  // JSON array

  optional binary organization_id (UTF8);
  optional int32 employee_count;

  optional binary data (UTF8);

  optional binary created_at (UTF8);
  optional binary updated_at (UTF8);
}
```

## Parquet Schema for Organizations

```parquet
message organization {
  required binary id (UTF8);
  required binary name (UTF8);
  optional binary legal_name (UTF8);
  optional binary domain (UTF8);
  optional binary type (UTF8);
  optional binary industry (UTF8);

  optional int32 employee_count;
  optional int64 revenue;
  optional int32 founded_year;

  optional binary country (UTF8);
  optional binary state (UTF8);
  optional binary city (UTF8);
  optional binary address (UTF8);
  optional float lat;
  optional float lng;

  optional binary website (UTF8);
  optional binary linkedin_url (UTF8);
  optional binary twitter_handle (UTF8);
  optional binary github_org (UTF8);

  optional binary org_chart (UTF8);  // JSON
  optional binary people (UTF8);     // JSON array

  optional binary data (UTF8);

  optional binary created_at (UTF8);
  optional binary updated_at (UTF8);
}
```

## Parquet Schema for Domains

```parquet
message domain {
  required binary domain (UTF8);
  required binary tld (UTF8);

  optional binary nameservers (UTF8);     // JSON array
  optional binary mx_records (UTF8);      // JSON array
  optional binary a_records (UTF8);       // JSON array
  optional binary aaaa_records (UTF8);    // JSON array
  optional binary txt_records (UTF8);     // JSON array

  optional boolean dnssec_enabled;
  optional binary ds_records (UTF8);      // JSON array
  optional binary dnskey_records (UTF8);  // JSON array

  optional binary registrar (UTF8);
  optional binary registrar_id (UTF8);

  optional binary created_date (UTF8);
  optional binary expiry_date (UTF8);
  optional binary last_updated (UTF8);

  optional binary zone_file_r2_key (UTF8);
  optional int64 zone_file_size;
  optional binary zone_file_hash (UTF8);

  optional binary data (UTF8);

  optional binary created_at (UTF8);
  optional binary updated_at (UTF8);
}
```

## Parquet Schema for WHOIS Records

```parquet
message whois_record {
  required binary domain (UTF8);

  optional binary registrant_name (UTF8);
  optional binary registrant_email (UTF8);
  optional binary registrant_organization (UTF8);
  optional binary registrant_country (UTF8);
  optional binary registrant_state (UTF8);
  optional binary registrant_city (UTF8);

  optional binary registrar_name (UTF8);
  optional binary registrar_id (UTF8);
  optional binary registrar_url (UTF8);
  optional binary registrar_abuse_email (UTF8);
  optional binary registrar_abuse_phone (UTF8);

  optional binary created_date (UTF8);
  optional binary updated_date (UTF8);
  optional binary expiry_date (UTF8);

  optional binary nameservers (UTF8);    // comma-separated
  optional binary status_codes (UTF8);   // comma-separated
  optional binary dnssec (UTF8);

  optional binary raw_whois (UTF8);

  optional binary data (UTF8);

  optional binary last_checked_at (UTF8);
  optional binary created_at (UTF8);
  optional binary updated_at (UTF8);
}
```

## D1 Schema (Operational Metadata Only)

D1 is now used ONLY for lightweight operational data:

```sql
-- Ingestion run tracking (small, frequently updated)
CREATE TABLE ingestion_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  run_type TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  cursor TEXT,
  data TEXT
);

-- Last sync state (tiny, frequently read/written)
CREATE TABLE sync_state (
  source TEXT PRIMARY KEY,
  last_sequence TEXT,
  last_sync_time TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Failed messages (for retry/debugging)
CREATE TABLE failed_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_name TEXT NOT NULL,
  message_body TEXT NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  original_timestamp TEXT NOT NULL,
  failed_at TEXT NOT NULL,
  status TEXT DEFAULT 'failed',
  resolved_at TEXT
);
```

## R2 SQL Query Examples

Once data is in R2 with Data Catalog, you can query directly:

```sql
-- Query NPM packages by downloads
SELECT name, version, downloads_total, license
FROM r2_sql('data-ingestion/npm/metadata/partitions.parquet')
WHERE downloads_total > 1000000
ORDER BY downloads_total DESC
LIMIT 100;

-- Find email patterns for tech companies
SELECT domain, pattern, confidence, sources
FROM r2_sql('data-ingestion/email-patterns/metadata/partitions.parquet')
WHERE verified = true AND confidence > 0.8;

-- Search GitHub commits for email domain
SELECT author_email, repo, COUNT(*) as commit_count
FROM r2_sql('data-ingestion/github/commits/partitions.parquet')
WHERE author_email LIKE '%@stripe.com'
GROUP BY author_email, repo
ORDER BY commit_count DESC;

-- Find expiring domains
SELECT domain, registrar_name, expiry_date
FROM r2_sql('data-ingestion/whois/metadata/partitions.parquet')
WHERE CAST(expiry_date AS DATE) BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)
ORDER BY expiry_date;
```

## Data Ingestion Flow

1. **Workers** fetch data from sources
2. **Queue messages** sent to processing pipeline
3. **Pipelines API** receives structured data
4. **Cloudflare Streams** processes in real-time
5. **R2** stores both:
   - Raw JSON (for full fidelity)
   - Parquet files (for SQL queries)
6. **R2 Data Catalog** indexes the data
7. **R2 SQL** provides query interface

## Benefits

- **Unlimited Scale**: R2 has no 10GB limit
- **Cost Effective**: R2 storage is $0.015/GB/month
- **Fast Queries**: Parquet + R2 SQL is optimized for analytics
- **Data Lake**: All raw data preserved in JSON
- **Flexibility**: Can reprocess/transform anytime
