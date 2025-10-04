import { DurableObject } from 'cloudflare:workers'
import type { Env, EnrichmentJob } from '../types'

/**
 * EnrichmentEngine Durable Object
 *
 * Provides stateful enrichment processing with job queuing and retries.
 * This is a stub implementation for future enhancements.
 *
 * Future features:
 * - Job queuing for large batch requests
 * - Retry logic with exponential backoff
 * - Progress tracking for long-running jobs
 * - Rate limiting coordination across workers
 */
export class EnrichmentEngine extends DurableObject<Env> {
  private jobs: Map<string, EnrichmentJob>

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.jobs = new Map()
  }

  /**
   * Create a new enrichment job
   */
  async createJob(type: 'person' | 'company', input: any): Promise<string> {
    const job: EnrichmentJob = {
      id: crypto.randomUUID(),
      type,
      input,
      status: 'pending',
      created_at: new Date().toISOString(),
    }

    this.jobs.set(job.id, job)
    await this.ctx.storage.put(`job:${job.id}`, job)

    return job.id
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<EnrichmentJob | null> {
    let job = this.jobs.get(jobId)

    if (!job) {
      job = await this.ctx.storage.get<EnrichmentJob>(`job:${jobId}`)
      if (job) {
        this.jobs.set(jobId, job)
      }
    }

    return job || null
  }

  /**
   * Update job status
   */
  async updateJob(jobId: string, updates: Partial<EnrichmentJob>): Promise<void> {
    const job = await this.getJob(jobId)

    if (!job) {
      throw new Error('Job not found')
    }

    const updatedJob = { ...job, ...updates }
    this.jobs.set(jobId, updatedJob)
    await this.ctx.storage.put(`job:${jobId}`, updatedJob)
  }

  /**
   * List all jobs
   */
  async listJobs(): Promise<EnrichmentJob[]> {
    const jobsMap = await this.ctx.storage.list<EnrichmentJob>({ prefix: 'job:' })
    return Array.from(jobsMap.values())
  }

  /**
   * Clean up completed jobs older than 24 hours
   */
  async cleanup(): Promise<number> {
    const jobs = await this.listJobs()
    const cutoff = Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago

    let cleaned = 0

    for (const job of jobs) {
      if (job.status === 'completed' || job.status === 'failed') {
        const jobTime = new Date(job.completed_at || job.created_at).getTime()

        if (jobTime < cutoff) {
          await this.ctx.storage.delete(`job:${job.id}`)
          this.jobs.delete(job.id)
          cleaned++
        }
      }
    }

    return cleaned
  }

  /**
   * Handle HTTP fetch requests (for future use)
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/status') {
      return Response.json({
        jobs: this.jobs.size,
        uptime: Date.now(),
      })
    }

    return Response.json(
      {
        error: 'Not implemented',
      },
      501
    )
  }
}
