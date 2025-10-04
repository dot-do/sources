# R2 Data Catalog Schemas

All data stored in **Apache Parquet** format for efficient querying with R2 SQL.

## Storage Structure

```
r2://data-ingestion/
├── npm/
│   ├── year=2025/
│   │   ├── month=01/
│   │   │   ├── day=01/
│   │   │   │   └── packages_00001.parquet
│   │   │   └── day=02/
│   │   └── month=02/
│   └── _metadata/
│       └── catalog.json
├── pypi/
│   └── year=2025/...
├── github/
│   ├── profiles/
│   ├── repos/
│   └── commits/
├── emails/
├── orgs/
├── domains/
└── whois/
```

---

## 1. NPM Packages Schema

**Path:** `npm/year=YYYY/month=MM/day=DD/packages_*.parquet`

```parquet
message npm_package {
  required binary name (STRING);
  required binary version (STRING);
  optional binary description (STRING);
  optional binary author (STRING);
  optional binary license (STRING);
  optional binary homepage (STRING);
  optional binary repository (STRING);

  // Metrics
  optional int64 downloads_total;
  optional int64 downloads_last_month;
  optional int64 downloads_last_week;
  optional int32 stars;
  optional int32 forks;

  // Dates (stored as INT64 timestamp in milliseconds)
  optional int64 published_at;
  optional int64 last_updated;

  // Dependencies (stored as JSON strings)
  optional binary dependencies (STRING);
  optional binary dev_dependencies (STRING);
  optional binary peer_dependencies (STRING);

  // Keywords (array of strings)
  repeated binary keywords (STRING);

  // Full data (JSON)
  required binary data (STRING);

  // Ingestion metadata
  required int64 ingested_at;
  required binary ingestion_id (STRING);
}
```

---

## 2. PyPI Packages Schema

**Path:** `pypi/year=YYYY/month=MM/day=DD/packages_*.parquet`

```parquet
message pypi_package {
  required binary name (STRING);
  required binary version (STRING);
  optional binary summary (STRING);
  optional binary author (STRING);
  optional binary author_email (STRING);
  optional binary license (STRING);
  optional binary home_page (STRING);

  // Dependencies
  repeated binary requires_dist (STRING);

  // Keywords
  optional binary keywords (STRING);

  // Classifiers
  repeated binary classifiers (STRING);

  // Upload info
  optional int64 upload_time;
  optional int32 size;
  optional binary sha256 (STRING);

  // Full data (JSON)
  required binary data (STRING);

  // Ingestion metadata
  required int64 ingested_at;
  required binary ingestion_id (STRING);
}
```

---

## 3. GitHub Profiles Schema

**Path:** `github/profiles/year=YYYY/month=MM/day=DD/profiles_*.parquet`

```parquet
message github_profile {
  required int64 id;
  required binary login (STRING);
  optional binary name (STRING);
  optional binary email (STRING);
  optional binary company (STRING);
  optional binary blog (STRING);
  optional binary location (STRING);
  optional binary bio (STRING);

  // Stats
  optional int32 public_repos;
  optional int32 public_gists;
  optional int32 followers;
  optional int32 following;

  // Dates
  optional int64 created_at;
  optional int64 updated_at;

  // Full data (JSON)
  required binary data (STRING);

  // Ingestion metadata
  required int64 ingested_at;
  required binary ingestion_id (STRING);
}
```

---

## 4. GitHub Repositories Schema

**Path:** `github/repos/year=YYYY/month=MM/day=DD/repos_*.parquet`

```parquet
message github_repo {
  required int64 id;
  required binary full_name (STRING);
  required binary name (STRING);
  required binary owner_login (STRING);
  optional binary description (STRING);
  optional binary language (STRING);
  optional binary license (STRING);
  optional binary homepage (STRING);

  // Stats
  optional int32 stargazers_count;
  optional int32 forks_count;
  optional int32 watchers_count;
  optional int32 open_issues_count;
  optional int64 size;

  // Flags
  optional boolean fork;
  optional boolean archived;
  optional boolean disabled;

  // Dates
  optional int64 created_at;
  optional int64 updated_at;
  optional int64 pushed_at;

  // Topics
  repeated binary topics (STRING);

  // Full data (JSON)
  required binary data (STRING);

  // Ingestion metadata
  required int64 ingested_at;
  required binary ingestion_id (STRING);
}
```

---

## 5. GitHub Commits Schema

**Path:** `github/commits/year=YYYY/month=MM/day=DD/commits_*.parquet`

```parquet
message github_commit {
  required binary sha (STRING);
  required binary repo_full_name (STRING);

  // Author (from commit)
  required binary author_name (STRING);
  required binary author_email (STRING);
  optional int64 author_date;

  // Committer (from commit)
  required binary committer_name (STRING);
  required binary committer_email (STRING);
  optional int64 committer_date;

  // GitHub user (from API)
  optional binary author_login (STRING);
  optional int64 author_id;

  // Message
  required binary message (STRING);

  // Stats
  optional int32 additions;
  optional int32 deletions;
  optional int32 total_changes;

  // Full data (JSON)
  required binary data (STRING);

  // Ingestion metadata
  required int64 ingested_at;
  required binary ingestion_id (STRING);
}
```

---

## 6. Email Patterns Schema

**Path:** `emails/year=YYYY/month=MM/day=DD/patterns_*.parquet`

```parquet
message email_pattern {
  required binary domain (STRING);
  required binary pattern (STRING);

  // Confidence
  required double confidence;
  required boolean verified;
  optional int64 verified_at;
  optional binary verified_by (STRING);

  // Sources
  repeated binary sources (STRING);

  // Sample emails
  repeated binary sample_emails (STRING);

  // Organization
  optional binary organization_id (STRING);
  optional int32 employee_count;

  // Full data (JSON)
  required binary data (STRING);

  // Ingestion metadata
  required int64 ingested_at;
  required binary ingestion_id (STRING);
}
```

---

## 7. Organizations Schema

**Path:** `orgs/year=YYYY/month=MM/day=DD/orgs_*.parquet`

```parquet
message organization {
  required binary id (STRING);
  required binary name (STRING);
  optional binary legal_name (STRING);
  optional binary domain (STRING);
  optional binary type (STRING);
  optional binary industry (STRING);

  // Size
  optional int32 employee_count;
  optional int64 revenue;
  optional int32 founded_year;

  // Location
  optional binary country (STRING);
  optional binary state (STRING);
  optional binary city (STRING);
  optional double lat;
  optional double lng;

  // Social
  optional binary website (STRING);
  optional binary linkedin_url (STRING);
  optional binary twitter_handle (STRING);
  optional binary github_org (STRING);

  // Org chart (JSON string)
  optional binary org_chart (STRING);

  // People (JSON array)
  optional binary people (STRING);

  // Full data (JSON)
  required binary data (STRING);

  // Ingestion metadata
  required int64 ingested_at;
  required binary ingestion_id (STRING);
}
```

---

## 8. Domains (Zone Files) Schema

**Path:** `domains/year=YYYY/month=MM/day=DD/domains_*.parquet`

```parquet
message domain {
  required binary domain (STRING);
  required binary tld (STRING);

  // DNS records (JSON arrays)
  optional binary nameservers (STRING);
  optional binary mx_records (STRING);
  optional binary a_records (STRING);
  optional binary aaaa_records (STRING);
  optional binary txt_records (STRING);

  // DNSSEC
  optional boolean dnssec_enabled;
  optional binary ds_records (STRING);
  optional binary dnskey_records (STRING);

  // Registrar
  optional binary registrar (STRING);
  optional binary registrar_id (STRING);

  // Dates
  optional int64 created_date;
  optional int64 expiry_date;
  optional int64 last_updated;

  // Zone file (stored separately in R2)
  optional binary zone_file_r2_key (STRING);
  optional int64 zone_file_size;
  optional binary zone_file_hash (STRING);

  // Full data (JSON)
  required binary data (STRING);

  // Ingestion metadata
  required int64 ingested_at;
  required binary ingestion_id (STRING);
}
```

---

## 9. WHOIS Records Schema

**Path:** `whois/year=YYYY/month=MM/day=DD/whois_*.parquet`

```parquet
message whois_record {
  required binary domain (STRING);

  // Registrant (often redacted)
  optional binary registrant_name (STRING);
  optional binary registrant_email (STRING);
  optional binary registrant_organization (STRING);
  optional binary registrant_country (STRING);

  // Registrar
  optional binary registrar_name (STRING);
  optional binary registrar_id (STRING);
  optional binary registrar_url (STRING);
  optional binary registrar_abuse_email (STRING);
  optional binary registrar_abuse_phone (STRING);

  // Dates
  optional int64 created_date;
  optional int64 updated_date;
  optional int64 expiry_date;

  // Nameservers
  repeated binary nameservers (STRING);

  // Status codes
  repeated binary status_codes (STRING);

  // DNSSEC
  optional binary dnssec (STRING);

  // Raw WHOIS text (for full preservation)
  optional binary raw_whois (STRING);

  // Full data (JSON)
  required binary data (STRING);

  // Ingestion metadata
  required int64 ingested_at;
  required binary ingestion_id (STRING);
  optional int64 last_checked_at;
}
```

---

## Partitioning Strategy

**Time-based partitioning** by year/month/day:
- Enables efficient time-range queries
- Easier data lifecycle management (delete old partitions)
- Optimized for incremental ingestion

**File size targets:**
- Target: 128-256 MB per Parquet file
- Row groups: 1M rows
- Compression: Snappy (fast) or ZSTD (better compression)

---

## R2 SQL Queries

Once data is in R2, query with SQL:

```sql
-- NPM packages by downloads
SELECT name, version, downloads_total
FROM read_parquet('r2://data-ingestion/npm/year=2025/month=01/**/*.parquet')
WHERE downloads_total > 1000000
ORDER BY downloads_total DESC
LIMIT 100;

-- GitHub commits by domain
SELECT author_email, COUNT(*) as commit_count
FROM read_parquet('r2://data-ingestion/github/commits/**/*.parquet')
WHERE author_email LIKE '%@example.com'
GROUP BY author_email
ORDER BY commit_count DESC;

-- Email patterns with high confidence
SELECT domain, pattern, confidence
FROM read_parquet('r2://data-ingestion/emails/**/*.parquet')
WHERE confidence > 0.8
ORDER BY confidence DESC;
```

---

## Data Catalog Metadata

Each namespace has a `_metadata/catalog.json` file:

```json
{
  "namespace": "npm",
  "schema_version": "1.0",
  "record_count": 2500000,
  "first_ingestion": "2025-01-01T00:00:00Z",
  "last_ingestion": "2025-01-15T23:59:59Z",
  "partitions": [
    {
      "path": "year=2025/month=01/day=01/packages_00001.parquet",
      "record_count": 10000,
      "file_size": 134217728,
      "time_range": {
        "start": "2025-01-01T00:00:00Z",
        "end": "2025-01-01T23:59:59Z"
      }
    }
  ]
}
```
