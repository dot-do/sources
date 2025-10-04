#!/bin/bash
# Setup R2 buckets for software product data ingestion

set -e

echo "🪣 Creating R2 buckets for software products..."

# Create main data bucket
echo "Creating software-products bucket..."
wrangler r2 bucket create software-products || echo "Bucket may already exist"

# Create raw data bucket (for debugging)
echo "Creating software-products-raw bucket..."
wrangler r2 bucket create software-products-raw || echo "Bucket may already exist"

echo "✅ R2 buckets created"

# List buckets to confirm
echo ""
echo "📋 Current R2 buckets:"
wrangler r2 bucket list
