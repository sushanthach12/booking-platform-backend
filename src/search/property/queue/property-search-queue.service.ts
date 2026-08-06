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
 */
@Injectable()
export class PropertySearchQueueService {
  constructor(
    @InjectQueue(PROPERTY_SEARCH_QUEUE) private readonly queue: Queue,
  ) {}

  enqueueIndex(propertyId: string) {
    return this.queue.add(
      JOB_INDEX_PROPERTY,
      { propertyId },
      { ...RETRY_OPTS, jobId: `index-${propertyId}` },
    );
  }

  enqueueDelete(propertyId: string) {
    return this.queue.add(
      JOB_DELETE_PROPERTY,
      { propertyId },
      { ...RETRY_OPTS, jobId: `delete-${propertyId}` },
    );
  }

  enqueueReindexAll() {
    return this.queue.add(JOB_REINDEX_ALL, {}, RETRY_OPTS);
  }
}
