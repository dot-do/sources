#!/bin/bash
# Setup Workers Queues for software product ingestion

set -e

echo "📬 Creating Workers Queues..."

# Create main ingestion queue
echo "Creating software-ingestion-queue..."
wrangler queues create software-ingestion-queue || echo "Queue may already exist"

# Create dead letter queue
echo "Creating software-ingestion-dlq..."
wrangler queues create software-ingestion-dlq || echo "Queue may already exist"

echo "✅ Queues created"

# List queues to confirm
echo ""
echo "📋 Current queues:"
wrangler queues list
