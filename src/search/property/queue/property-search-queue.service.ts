import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  JOB_DELETE_PROPERTY,
  JOB_INDEX_PROPERTY,
  JOB_REINDEX_ALL,
  PROPERTY_SEARCH_QUEUE,
} from './constants';

const RETRY_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
} as const;

/**
 * Single responsibility: know how to enqueue search-indexing jobs.
 * The listener depends on this, not on BullMQ's Queue API directly —
 * keeps the queue name and job payload shape in exactly one place.
 *
 * Jobs deliberately use BullMQ's auto-generated ids. A stable per-property
 * `jobId` looks like useful burst-collapsing, but BullMQ treats an existing
 * job key as a duplicate and silently drops the add — and because completed
 * and failed jobs are retained, the key never goes away, so every update after
 * the first is lost. Duplicate jobs are harmless instead: `indexOne` re-reads
 * the property from Postgres and upserts by document id, so replaying it
 * always converges on the property's current state.
 */
@Injectable()
export class PropertySearchQueueService {
  constructor(
    @InjectQueue(PROPERTY_SEARCH_QUEUE) private readonly queue: Queue,
  ) {}

  enqueueIndex(propertyId: string) {
    return this.queue.add(JOB_INDEX_PROPERTY, { propertyId }, RETRY_OPTS);
  }

  enqueueDelete(propertyId: string) {
    return this.queue.add(JOB_DELETE_PROPERTY, { propertyId }, RETRY_OPTS);
  }

  enqueueReindexAll() {
    return this.queue.add(JOB_REINDEX_ALL, {}, RETRY_OPTS);
  }
}
