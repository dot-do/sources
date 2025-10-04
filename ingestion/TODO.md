# TODO: Refactor to Unified Ingestion Format

This directory contains the legacy data-ingestion codebase that needs major refactoring to match the unified MDX format defined in REPO.md.

## Current State
- Mixed structure with workers, scrapers, and data pipelines
- Inconsistent naming and organization
- Custom code implementations without standardized metadata

## Target Structure
All ingestion sources should follow: `sources/[source]/[resource].mdx`

### Format Requirements:
1. **YAML Frontmatter** - For normal/standard data formats
   ```yaml
   ---
   source: source-name
   resource: resource-type
   format: json|csv|api|scrape
   schedule: cron-expression
   ---
   ```

2. **Code Exports** - For custom implementations
   ```typescript
   export async function fetch(params) { ... }
   export async function transform(data) { ... }
   export async function load(records) { ... }
   ```

3. **Consistent Naming**
   - Use kebab-case for files
   - Clear source/resource separation
   - Self-documenting names

## Migration Tasks
- [ ] Audit all current ingestion workers
- [ ] Map to source/resource taxonomy
- [ ] Create standardized MDX templates
- [ ] Migrate worker logic to exports
- [ ] Update worker references
- [ ] Test all ingestion pipelines
- [ ] Archive old structure

## Estimated Effort
**Major refactoring** - 40-60 hours
- 15+ workers to migrate
- Complex data transformation logic
- Integration with existing systems
- Comprehensive testing required

---

**Priority:** P2 (Not blocking current operations)
**Owner:** TBD
**Created:** 2025-10-04
