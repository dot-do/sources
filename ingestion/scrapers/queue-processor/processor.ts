/**
 * Queue Processor - Consumes scraping queue messages and saves to R2
 *
 * Process:
 * 1. Receive batch of messages from queue (up to 10)
 * 2. Group by source
 * 3. Accumulate records (up to 1000 or 10MB)
 * 4. Write batch to R2 as NDJSON
 * 5. Track in metadata
 */

import { Product, ProductSchema } from '../../schemas/product'
import { v4 as uuidv4 } from 'uuid'

export interface Env {
  // Storage
  RAW_BUCKET: R2Bucket
  PRODUCTS_BUCKET: R2Bucket

  // KV for state
  KV: KVNamespace

  // Analytics (optional)
  ANALYTICS?: AnalyticsEngineDataset
}

interface QueueMessage {
  messageId: string
  source: string
  category?: string
  productUrl?: string
  productId?: string
  priority: number
  retryCount: number
  metadata?: {
    product?: Product
  }
}

interface BatchAccumulator {
  source: string
  category: string
  products: Product[]
  size: number // bytes
  startTime: number
}

const MAX_BATCH_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_BATCH_COUNT = 1000

/**
 * Queue processor worker
 */
export default {
  /**
   * Queue consumer - processes batches of messages
   */
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    console.log(`Processing batch of ${batch.messages.length} messages`)

    // Group messages by source
    const batches = new Map<string, BatchAccumulator>()

    for (const message of batch.messages) {
      try {
        const msg = message.body

        // Extract product from metadata
        const product = msg.metadata?.product

        if (!product) {
          console.warn(`Message ${msg.messageId} has no product data`)
          message.ack()
          continue
        }

        // Validate product
        const validated = ProductSchema.safeParse(product)

        if (!validated.success) {
          console.error(`Invalid product data in message ${msg.messageId}:`, validated.error)
          message.retry()
          continue
        }

        const validProduct = validated.data

        // Get or create batch accumulator
        const batchKey = `${validProduct.source}:${validProduct.category}`

        if (!batches.has(batchKey)) {
          batches.set(batchKey, {
            source: validProduct.source,
            category: validProduct.category,
            products: [],
            size: 0,
            startTime: Date.now(),
          })
        }

        const accumulator = batches.get(batchKey)!

        // Add product to batch
        accumulator.products.push(validProduct)

        // Estimate size (rough)
        accumulator.size += JSON.stringify(validProduct).length

        // Flush if batch is full
        if (accumulator.products.length >= MAX_BATCH_COUNT || accumulator.size >= MAX_BATCH_SIZE) {
          await flushBatch(accumulator, env)
          batches.delete(batchKey)
        }

        message.ack()
      } catch (error) {
        console.error(`Error processing message:`, error)
        message.retry()
      }
    }

    // Flush remaining batches
    for (const accumulator of batches.values()) {
      await flushBatch(accumulator, env)
    }

    console.log(`Batch processing complete`)
  },

  /**
   * HTTP handler for status/debugging
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/status') {
      // Get processing stats from KV
      const stats = {
        lastProcessed: await env.KV.get('processor:last_processed'),
        totalProcessed: await env.KV.get('processor:total_processed'),
        totalBatches: await env.KV.get('processor:total_batches'),
        errors: await env.KV.get('processor:errors'),
      }

      return new Response(JSON.stringify(stats, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      service: 'queue-processor',
      status: 'running',
      endpoints: {
        '/status': 'Get processor statistics',
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  },
}

/**
 * Flush batch to R2
 */
async function flushBatch(batch: BatchAccumulator, env: Env): Promise<void> {
  const batchId = uuidv4()
  const timestamp = Date.now()
  const date = new Date(timestamp)

  // Generate R2 path
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  const path = `${batch.source}/year=${year}/month=${month}/day=${day}/category=${batch.category}/batch_${timestamp}_${batchId}.ndjson`

  console.log(`Flushing batch: ${batch.products.length} products to ${path}`)

  try {
    // Convert products to NDJSON
    const ndjson = batch.products.map(p => JSON.stringify(p)).join('\n')

    // Write to R2
    await env.PRODUCTS_BUCKET.put(path, ndjson, {
      customMetadata: {
        batchId,
        source: batch.source,
        category: batch.category,
        count: String(batch.products.length),
        timestamp: String(timestamp),
      },
    })

    // Update stats in KV
    const totalProcessed = parseInt((await env.KV.get('processor:total_processed')) || '0')
    const totalBatches = parseInt((await env.KV.get('processor:total_batches')) || '0')

    await env.KV.put('processor:last_processed', new Date().toISOString())
    await env.KV.put('processor:total_processed', String(totalProcessed + batch.products.length))
    await env.KV.put('processor:total_batches', String(totalBatches + 1))

    // Track in Analytics Engine
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['queue-processor', batch.source, batch.category],
        doubles: [batch.products.length, batch.size, Date.now() - batch.startTime],
        indexes: [batch.source],
      })
    }

    console.log(`Batch flushed successfully: ${batch.products.length} products`)
  } catch (error) {
    console.error(`Error flushing batch:`, error)

    // Track error
    const errors = parseInt((await env.KV.get('processor:errors')) || '0')
    await env.KV.put('processor:errors', String(errors + 1))

    throw error
  }
}
