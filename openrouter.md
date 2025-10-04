---
title: OpenRouter AI Model Registry
description: Unified API for 200+ AI models from multiple providers with routing, caching, and fallbacks
type: API
endpoint: https://openrouter.ai/api/v1
format: JSON
updateFrequency: real-time
license: Commercial
authentication: API Key
metadata:
  ns: sources
  visibility: public
tags:
  - ai
  - llm
  - models
  - openrouter
---

# OpenRouter AI Model Registry

OpenRouter provides unified access to 200+ AI models from multiple providers including OpenAI, Anthropic, Google, Meta, Mistral, and more.

## Purpose

This source provides comprehensive AI model metadata for:
- **Model Discovery** - Browse and compare 200+ models
- **Provider Management** - Track labs/providers and their models
- **Pricing Information** - Cost per token for input/output
- **Capability Tracking** - Context windows, modalities, features
- **Performance Metrics** - Latency, throughput, quality scores

## Data Structure

### Collections

This source populates three database collections:

#### 1. Models (`db/Models/`)
- **Namespace:** `models`
- **Type:** `Model`
- **Purpose:** Individual AI model definitions

**Schema:**
```typescript
interface Model {
  id: string                    // e.g., "openai/gpt-4-turbo"
  name: string                  // Display name
  description: string           // Model description
  provider: string              // Lab/provider ID
  pricing: {
    prompt: number              // $/token input
    completion: number          // $/token output
  }
  context_length: number        // Max tokens
  modalities: string[]          // ["text", "image", "audio"]
  features: string[]            // ["function_calling", "streaming"]
  architecture?: string         // "transformer", "diffusion", etc.
  parameters?: string           // "7B", "70B", "175B"
  released?: string             // ISO date
  deprecated?: boolean
  metadata: {
    ns: 'models'
    visibility: 'public'
  }
}
```

#### 2. Labs/Providers (`db/Labs/`)
- **Namespace:** `labs`
- **Type:** `Lab`
- **Purpose:** AI research labs and model providers

**Schema:**
```typescript
interface Lab {
  id: string                    // e.g., "openai", "anthropic"
  name: string                  // Display name
  description: string           // Company description
  website?: string              // Homepage URL
  models: string[]              // Model IDs from this provider
  founded?: string              // ISO date
  headquarters?: string         // Location
  metadata: {
    ns: 'labs'
    visibility: 'public'
  }
}
```

#### 3. Providers (Relationships)
- **Type:** `provider`
- **Purpose:** Links labs to their models

**Relationship:**
```typescript
{
  type: 'provider'
  fromNs: 'labs'
  fromId: 'openai'
  toNs: 'models'
  toId: 'openai/gpt-4-turbo'
}
```

## API Endpoints

### List Models
```http
GET https://openrouter.ai/api/v1/models
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "data": [
    {
      "id": "openai/gpt-4-turbo",
      "name": "GPT-4 Turbo",
      "description": "Latest GPT-4 with 128K context",
      "pricing": {
        "prompt": "0.00001",
        "completion": "0.00003"
      },
      "context_length": 128000,
      "architecture": {
        "modality": "text",
        "tokenizer": "GPT"
      }
    }
  ]
}
```

### Get Model Details
```http
GET https://openrouter.ai/api/v1/models/{model_id}
Authorization: Bearer YOUR_API_KEY
```

## Data Ingestion

### Import Strategy

**Frequency:** Daily (2am UTC)

**Process:**
1. **Fetch** - GET /api/v1/models from OpenRouter
2. **Transform** - Map API response to database schema
3. **Extract Labs** - Derive lab entities from model IDs
4. **Upsert Models** - Update existing or insert new models
5. **Upsert Labs** - Update existing or insert new labs
6. **Create Relationships** - Link labs to models

**Worker:** `sources/ingestion/workers/openrouter-ingestion.ts`

**Implementation:**
```typescript
import { neon } from '@neondatabase/serverless'
import type { Model, Lab } from './types'

const sql = neon(process.env.DATABASE_URL!)

export async function ingestOpenRouter() {
  // 1. Fetch from OpenRouter API
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://do.industries',
      'X-Title': 'DO Platform'
    }
  })

  const { data } = await response.json()

  // 2. Transform and extract labs
  const labs = new Map<string, Lab>()
  const models: Model[] = []

  for (const model of data) {
    const [labId] = model.id.split('/')

    // Extract lab
    if (!labs.has(labId)) {
      labs.set(labId, {
        id: labId,
        name: labId.charAt(0).toUpperCase() + labId.slice(1),
        description: `AI research lab providing ${labId} models`,
        models: [],
        metadata: { ns: 'labs', visibility: 'public' }
      })
    }

    labs.get(labId)!.models.push(model.id)

    // Transform model
    models.push({
      id: model.id,
      name: model.name,
      description: model.description || '',
      provider: labId,
      pricing: {
        prompt: parseFloat(model.pricing.prompt),
        completion: parseFloat(model.pricing.completion)
      },
      context_length: model.context_length,
      modalities: [model.architecture.modality],
      features: [],
      metadata: { ns: 'models', visibility: 'public' }
    })
  }

  // 3. Upsert to database
  for (const lab of labs.values()) {
    await sql`
      INSERT INTO things (ns, id, type, data, content)
      VALUES ('labs', ${lab.id}, 'Lab', ${JSON.stringify(lab)}, ${lab.description})
      ON CONFLICT (ns, id) DO UPDATE
      SET data = EXCLUDED.data, content = EXCLUDED.content, updated_at = NOW()
    `
  }

  for (const model of models) {
    await sql`
      INSERT INTO things (ns, id, type, data, content)
      VALUES ('models', ${model.id}, 'Model', ${JSON.stringify(model)}, ${model.description})
      ON CONFLICT (ns, id) DO UPDATE
      SET data = EXCLUDED.data, content = EXCLUDED.content, updated_at = NOW()
    `

    // Create provider relationship
    await sql`
      INSERT INTO relationships (ns, id, type, from_ns, from_id, to_ns, to_id, data)
      VALUES (
        'relationships',
        ${'provider-' + model.id},
        'provider',
        'labs',
        ${model.provider},
        'models',
        ${model.id},
        '{}'
      )
      ON CONFLICT (ns, id) DO NOTHING
    `
  }

  return { labs: labs.size, models: models.length }
}
```

## Usage Examples

### Query All Models
```typescript
const models = await env.DO.db_list('models', {
  type: 'Model',
  visibility: 'public'
})
```

### Get Model by ID
```typescript
const gpt4 = await env.DO.db_get('models', 'openai/gpt-4-turbo')
```

### Query Models by Provider
```typescript
// Get all OpenAI models
const openaiModels = await env.DO.db_search('models', {
  filter: { 'data.provider': 'openai' }
})
```

### Get Provider with Models
```typescript
// Get lab with all its models via relationships
const anthropic = await env.DO.db_get('labs', 'anthropic')
const models = await env.DO.db_list('models', {
  filter: { 'data.provider': 'anthropic' }
})
```

### Compare Model Pricing
```typescript
// Find cheapest models with >100K context
const models = await sql`
  SELECT
    id,
    data->>'name' as name,
    (data->'pricing'->>'prompt')::float as prompt_cost,
    (data->>'context_length')::int as context
  FROM things
  WHERE ns = 'models'
    AND type = 'Model'
    AND (data->>'context_length')::int > 100000
  ORDER BY (data->'pricing'->>'prompt')::float ASC
  LIMIT 10
`
```

## Authentication

### API Key Setup
```bash
# Get API key from https://openrouter.ai/keys
wrangler secret put OPENROUTER_API_KEY

# Add to .env for local development
echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env
```

### Headers Required
```typescript
{
  'Authorization': 'Bearer YOUR_API_KEY',
  'HTTP-Referer': 'https://your-site.com',  // Optional but recommended
  'X-Title': 'Your App Name'                 // Optional but recommended
}
```

## Rate Limits

- **Free Tier:** 200 requests/day
- **Paid Plans:** Higher limits based on credits
- **Caching:** OpenRouter caches responses for 5 minutes

## Related Sources

- **Anthropic Models** - Direct Anthropic API
- **OpenAI Models** - Direct OpenAI API
- **HuggingFace Models** - Open source models
- **Together AI** - Open model hosting

## Integration Points

### 1. `llm.do` Worker
- Proxy requests to OpenRouter
- Route based on model availability
- Handle fallbacks and retries

### 2. `models.do` Worker
- Query model metadata from database
- Compare models by capabilities
- Track model pricing and updates

### 3. `ai` Worker
- Use OpenRouter for generation
- Select models based on task requirements
- Track usage and costs

## Monitoring

### Sync Status
```sql
-- Last sync timestamp
SELECT updated_at FROM things
WHERE ns = 'models'
ORDER BY updated_at DESC
LIMIT 1;

-- Model count
SELECT COUNT(*) FROM things
WHERE ns = 'models' AND type = 'Model';

-- Lab count
SELECT COUNT(*) FROM things
WHERE ns = 'labs' AND type = 'Lab';
```

### Health Check
```typescript
// Verify recent sync
const lastSync = await sql`
  SELECT MAX(updated_at) as last_sync
  FROM things
  WHERE ns = 'models'
`

const hoursAgo = (Date.now() - new Date(lastSync[0].last_sync).getTime()) / (1000 * 60 * 60)

if (hoursAgo > 25) {
  console.warn('OpenRouter sync is stale:', { hoursAgo })
}
```

## See Also

- **[db/Models/readme.md](../db/Models/readme.md)** - Models collection schema
- **[db/Labs/readme.md](../db/Labs/readme.md)** - Labs collection schema
- **[workers/ai/README.md](../workers/ai/README.md)** - AI worker documentation
- **[OpenRouter API Docs](https://openrouter.ai/docs)** - Official API reference

---

**Last Updated:** 2025-10-04
**Maintained By:** Claude Code
**Next Sync:** Daily at 2am UTC
