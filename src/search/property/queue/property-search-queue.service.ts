import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PROPERTY_SEARCH_QUEUE } from '../../core/search.tokens';

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
      'index-property',
      { propertyId },
      { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
    );
  }

  enqueueDelete(propertyId: string) {
    return this.queue.add(
      'delete-property',
      { propertyId },
      { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
    );
  }
}
