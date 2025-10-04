// Cloudflare Workers Environment
export interface Env {
  DB: D1Database
  DATA_BUCKET: R2Bucket
  RATE_LIMIT_KV: KVNamespace
  ENRICHMENT_ENGINE: DurableObjectNamespace
  ANALYTICS: AnalyticsEngineDataset
  ENVIRONMENT: string
  LOG_LEVEL: string
  CACHE_TTL_SECONDS: string
  API_VERSION: string
}

// Hono Context Variables (set by middleware)
export interface ContextVariables {
  api_key: ApiKey
  rate_limit: RateLimitInfo
  credits: CreditInfo
}

// API Request/Response Types

export interface PersonEnrichmentRequest {
  email?: string
  domain?: string
  github_username?: string
  linkedin_url?: string
}

export interface CompanyEnrichmentRequest {
  domain?: string
  name?: string
  website?: string
}

export interface BulkEnrichmentRequest {
  type: 'person' | 'company'
  items: (PersonEnrichmentRequest | CompanyEnrichmentRequest)[]
}

export interface SearchPeopleRequest {
  domain: string
  limit?: number
  offset?: number
}

// Enriched Data Types

export interface Email {
  value: string
  type: 'work' | 'personal' | 'admin' | 'technical' | 'general'
  source: DataSource
  confidence: number
  verified: boolean
  last_seen: string
}

export interface GitHubProfile {
  username: string
  url: string
  name?: string
  email?: string
  bio?: string
  location?: string
  company?: string
  blog?: string
  public_repos: number
  followers: number
  following: number
  created_at: string
  updated_at: string
  avatar_url?: string
  languages?: string[]
  top_repos?: Repository[]
}

export interface Repository {
  name: string
  full_name: string
  description?: string
  url: string
  language?: string
  stars: number
  forks: number
  watchers: number
  created_at: string
  updated_at: string
  pushed_at: string
}

export interface GitHubOrganization {
  login: string
  url: string
  name?: string
  description?: string
  public_repos: number
  members?: number
  created_at: string
  updated_at: string
  languages?: string[]
  top_repos?: Repository[]
  activity_level?: 'low' | 'medium' | 'high'
  last_commit?: string
}

export interface WhoisData {
  domain: string
  registrar?: string
  registered_date?: string
  expiration_date?: string
  updated_date?: string
  registrant_name?: string
  registrant_email?: string
  registrant_organization?: string
  admin_email?: string
  technical_email?: string
  nameservers?: string[]
  dnssec?: boolean
  status?: string[]
}

export interface Location {
  city?: string
  state?: string
  country?: string
  address?: string
  latitude?: number
  longitude?: number
}

export interface Contact {
  emails?: Email[]
  phone?: string
  address?: string
}

export interface EnrichedPerson {
  name?: string
  email?: string
  emails?: Email[]
  github?: GitHubProfile
  company?: {
    domain: string
    name?: string
    confidence: number
  }
  social?: {
    twitter?: string
    linkedin?: string
    website?: string
  }
  location?: Location
  confidence_score: number
  data_sources: DataSource[]
  last_updated: string
}

export interface EnrichedCompany {
  name?: string
  legal_name?: string
  domain: string
  website?: string
  description?: string
  industry?: string
  employee_count?: number
  employee_count_range?: string
  founded_year?: number
  location?: Location
  contact?: Contact
  technology_stack?: {
    detected: boolean
    message?: string
    technologies?: string[]
  }
  github?: GitHubOrganization
  whois?: WhoisData
  confidence_score: number
  data_sources: DataSource[]
  last_updated: string
}

export type DataSource =
  | 'github_profile'
  | 'github_commits'
  | 'github_repos'
  | 'github_org'
  | 'whois'
  | 'website'
  | 'linkedin'
  | 'cache'

// API Response Types

export interface PersonEnrichmentResponse {
  person: EnrichedPerson
}

export interface CompanyEnrichmentResponse {
  company: EnrichedCompany
}

export interface BulkEnrichmentResponse {
  results: Array<{
    input: PersonEnrichmentRequest | CompanyEnrichmentRequest
    person?: EnrichedPerson
    company?: EnrichedCompany
    status: 'success' | 'failed' | 'partial'
    error?: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
    credits_used: number
  }
}

export interface SearchPeopleResponse {
  people: Array<{
    name?: string
    email?: string
    github_username?: string
    confidence_score: number
  }>
  total: number
  page: number
  per_page: number
  has_more: boolean
}

export interface StatusResponse {
  status: 'operational' | 'degraded' | 'maintenance'
  version: string
  uptime: number
  data_sources: {
    [key: string]: {
      status: 'operational' | 'degraded' | 'down'
      last_update: string
      records?: number
    }
  }
  rate_limits: {
    requests_per_minute: number
    requests_per_day: number
  }
}

export interface ApiError {
  error: {
    type: string
    message: string
    details?: unknown
    retry_after?: number
  }
}

// Authentication & Rate Limiting

export interface ApiKey {
  id: string
  user_id: string
  key_hash: string
  key_prefix: string
  tier: ApiTier
  rate_limit_rpm: number
  rate_limit_rpd: number
  credits_limit: number
  credits_used: number
  credits_reset_at: string
  created_at: string
  last_used_at?: string
  expires_at?: string
  revoked: boolean
}

export type ApiTier = 'free' | 'starter' | 'growth' | 'pro'

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}

export interface CreditInfo {
  limit: number
  used: number
  remaining: number
  reset: number
}

// Cache Types

export interface CacheEntry {
  id: string
  type: 'person' | 'company'
  input_key: string
  enriched_data: string // JSON
  confidence_score: number
  data_sources: string // JSON array
  created_at: string
  updated_at: string
  expires_at: string
  credits_used: number
}

// Data Source Raw Types (from R2 Parquet)

export interface GitHubCommit {
  sha: string
  repo_full_name: string
  author_name?: string
  author_email?: string
  committer_name?: string
  committer_email?: string
  message: string
  committed_at: string
  url: string
}

export interface GitHubProfileRaw {
  id: number
  login: string
  name?: string
  email?: string
  bio?: string
  location?: string
  company?: string
  blog?: string
  public_repos: number
  followers: number
  following: number
  created_at: string
  updated_at: string
  avatar_url?: string
}

export interface WhoisRecord {
  domain: string
  registrar?: string
  registered_date?: string
  expiration_date?: string
  updated_date?: string
  registrant_name?: string
  registrant_email?: string
  registrant_organization?: string
  registrant_country?: string
  admin_name?: string
  admin_email?: string
  admin_organization?: string
  technical_name?: string
  technical_email?: string
  technical_organization?: string
  nameservers?: string[]
  dnssec?: boolean
  status?: string[]
  raw_data?: string
}

// Enrichment Engine Types

export interface EnrichmentJob {
  id: string
  type: 'person' | 'company'
  input: PersonEnrichmentRequest | CompanyEnrichmentRequest
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: EnrichedPerson | EnrichedCompany
  error?: string
  created_at: string
  completed_at?: string
}

export interface ConfidenceScore {
  base: number
  source_weight: number
  freshness_multiplier: number
  verification_boosts: number
  final: number
}

export interface SourceData {
  source: DataSource
  data: unknown
  confidence: number
  age_days: number
  weight: number
}

// Utility Types

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface RequestContext {
  env: Env
  api_key?: ApiKey
  rate_limit: RateLimitInfo
  credits: CreditInfo
  request_id: string
  start_time: number
}
