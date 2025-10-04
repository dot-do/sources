#!/bin/bash
# Test scrapers with small batches

set -e

echo "🧪 Testing Software Product Scrapers"
echo "===================================="
echo ""

# Get worker URLs
G2_URL="https://g2-scraper-01.YOUR_SUBDOMAIN.workers.dev"
PH_URL="https://producthunt-scraper.YOUR_SUBDOMAIN.workers.dev"
HN_URL="https://hackernews-scraper.YOUR_SUBDOMAIN.workers.dev"

echo "⚠️  Update URLs in this script with your actual worker URLs"
echo "   Find them in Cloudflare dashboard or run: wrangler whoami"
echo ""
read -p "Press Enter when ready to continue..."

# Test 1: G2 Scraper
echo ""
echo "Test 1: G2 Scraper (1 product)"
echo "------------------------------"
curl -X GET "${G2_URL}/scrape?worker=1&limit=1" | jq '.'

# Wait a bit
sleep 2

# Test 2: Product Hunt Scraper
echo ""
echo "Test 2: Product Hunt Scraper (5 products)"
echo "----------------------------------------"
curl -X GET "${PH_URL}/scrape?timeframe=daily&limit=5" | jq '.'

# Wait a bit
sleep 2

# Test 3: Hacker News Scraper
echo ""
echo "Test 3: Hacker News Scraper (10 products)"
echo "---------------------------------------"
curl -X GET "${HN_URL}/scrape?type=show_hn&limit=10&days=7" | jq '.'

# Wait a bit
sleep 2

# Test 4: Check queue processor status
echo ""
echo "Test 4: Queue Processor Status"
echo "-----------------------------"
PROCESSOR_URL="https://queue-processor.YOUR_SUBDOMAIN.workers.dev"
curl -X GET "${PROCESSOR_URL}/status" | jq '.'

# Wait for processing
echo ""
echo "⏳ Waiting 10 seconds for queue processing..."
sleep 10

# Test 5: Check R2 bucket
echo ""
echo "Test 5: Check R2 Bucket Contents"
echo "-------------------------------"
wrangler r2 object list software-products --limit 10

echo ""
echo "✅ Tests complete!"
echo ""
echo "Next steps:"
echo "  1. Review test results above"
echo "  2. Check products in R2:"
echo "     wrangler r2 object list software-products"
echo "  3. View worker logs:"
echo "     wrangler tail g2-scraper-01"
echo "  4. View queue metrics:"
echo "     wrangler queues consumer software-ingestion-queue"
echo ""
