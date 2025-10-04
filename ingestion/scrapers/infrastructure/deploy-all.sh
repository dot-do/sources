#!/bin/bash
# Deploy all scrapers and infrastructure

set -e

echo "🚀 Deploying Software Product Scraping Infrastructure"
echo "=================================================="
echo ""

# Step 1: Create infrastructure
echo "📦 Step 1: Creating infrastructure..."
./infrastructure/setup-r2.sh
./infrastructure/setup-queues.sh
./infrastructure/setup-kv.sh

echo ""
echo "⏸️  Please update wrangler.toml files with KV namespace IDs"
echo "   Run: wrangler kv:namespace list"
echo "   Copy the 'id' values to each wrangler.toml"
echo ""
read -p "Press Enter when ready to continue..."

# Step 2: Install dependencies
echo ""
echo "📚 Step 2: Installing dependencies..."
pnpm install

# Step 3: Build TypeScript
echo ""
echo "🔨 Step 3: Building TypeScript..."
pnpm typecheck

# Step 4: Deploy queue processor
echo ""
echo "📬 Step 4: Deploying queue processor..."
cd queue-processor
wrangler deploy
cd ..

# Step 5: Deploy scrapers
echo ""
echo "🕷️  Step 5: Deploying scrapers..."

# G2 Scraper (worker 01)
echo "  ➤ Deploying G2 scraper (worker 01)..."
cd g2
wrangler deploy
cd ..

# Product Hunt Scraper
echo "  ➤ Deploying Product Hunt scraper..."
cd producthunt
wrangler deploy
cd ..

# Hacker News Scraper
echo "  ➤ Deploying Hacker News scraper..."
cd hackernews
wrangler deploy
cd ..

echo ""
echo "✅ All scrapers deployed successfully!"
echo ""
echo "📊 Next steps:"
echo "  1. Set secrets (if needed):"
echo "     cd producthunt && wrangler secret put PRODUCTHUNT_API_TOKEN"
echo "  2. Test scrapers:"
echo "     ./infrastructure/test-scrapers.sh"
echo "  3. Monitor logs:"
echo "     wrangler tail g2-scraper-01"
echo ""
