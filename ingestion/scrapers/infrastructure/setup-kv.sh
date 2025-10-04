#!/bin/bash
# Setup KV namespace for scraper rate limiting and state

set -e

echo "🗄️  Creating KV namespace..."

# Create KV namespace for scrapers
echo "Creating SCRAPER_KV namespace..."
wrangler kv:namespace create "SCRAPER_KV" || echo "Namespace may already exist"

# Create preview namespace for local dev
echo "Creating SCRAPER_KV preview namespace..."
wrangler kv:namespace create "SCRAPER_KV" --preview || echo "Preview namespace may already exist"

echo "✅ KV namespaces created"

# List namespaces
echo ""
echo "📋 Current KV namespaces:"
wrangler kv:namespace list
