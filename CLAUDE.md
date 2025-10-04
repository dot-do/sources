# CLAUDE.md - sources Repository

## Project Overview

The **sources repository** stores **data source definitions** as MDX files with Zod schema validation via Velite, enabling bidirectional synchronization with the PostgreSQL database.

**Purpose**: Define and manage data source entities as version-controlled MDX files that sync automatically to the database.

**Position**: 📝 **Content Layer** - Content source that syncs to db layer

## Schema

The Velite schema for data sources includes:

### Required Fields
- **title** (string): Data source name
- **description** (string): What data the source provides

### Optional Fields
- **type** (string): Source type (API, Database, File, Stream, etc.)
- **endpoint** (URL): Data source endpoint
- **format** (string): Data format (JSON, CSV, XML, etc.)
- **updateFrequency** (string): How often data updates
- **schema** (object): Data schema reference
- **authentication** (string): Auth requirements
- **license** (string): Data license
- **metadata**: Namespace and visibility
- **tags** (array): Categorization tags

## MDX File Example

```mdx
---
title: O*NET Occupation Data
description: Comprehensive occupational data from O*NET database
type: API
endpoint: https://services.onetcenter.org/
format: JSON
updateFrequency: quarterly
license: Public Domain
authentication: API Key
metadata:
  ns: sources
  visibility: public
tags:
  - occupations
  - labor
  - onet
---

# O*NET Occupation Data

The O*NET database contains occupational data for 900+ occupations including:

- Tasks and activities
- Skills and abilities
- Knowledge requirements
- Work context and values
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Build and validate all MDX files
pnpm build

# Watch mode for development
pnpm dev

# Type check
pnpm check-types
```

## Examples

See **[examples/](../examples/)** for working TypeScript + MDX data source examples:

- **census-data-source.mdx** - US Census Bureau demographics API (public data)
- **weather-api-source.mdx** - OpenWeather real-time weather data (public API)

These examples demonstrate:
- ✅ Full TypeScript intellisense in MDX files
- ✅ Complete ETL pipeline (Extract, Transform, Load)
- ✅ Real public APIs with authentication
- ✅ Scheduled imports and data refresh strategies
- ✅ Business use cases and query examples

Run examples: `pnpm --filter examples dev`

## Related Documentation

- **Parent**: [Root CLAUDE.md](../CLAUDE.md) - Multi-repo management
- **Database**: [db/CLAUDE.md](../db/CLAUDE.md) - Database schema and sync
- **API**: [api/CLAUDE.md](../api/CLAUDE.md) - Webhook handler

---

**Last Updated**: 2025-10-03
**Maintained By**: Claude Code
**Repository**: https://github.com/dot-do/sources
