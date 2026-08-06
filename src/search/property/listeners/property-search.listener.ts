import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  PROPERTY_AVAILABILITY_CHANGED,
  PROPERTY_CREATED,
  PROPERTY_DELETED,
  PROPERTY_UPDATED,
  PropertyChangedPayload,
} from '../../../common/events/property.events';
import { PropertySearchQueueService } from '../queue/property-search-queue.service';

/**
 * Observer pattern via NestJS EventEmitter: decouples property CRUD from
 * search indexing. PropertyService (and BookingService, for availability)
 * fire domain events and know nothing about search; this listener reacts
 * and hands off to the queue so an indexing failure/retry never blocks the
 * originating transaction.
 */
@Injectable()
export class PropertySearchListener {
  private readonly logger = new Logger(PropertySearchListener.name);

  constructor(private readonly searchQueue: PropertySearchQueueService) {}

  @OnEvent(PROPERTY_CREATED)
  @OnEvent(PROPERTY_UPDATED)
  @OnEvent(PROPERTY_AVAILABILITY_CHANGED)
  async onPropertyChanged(payload: PropertyChangedPayload): Promise<void> {
    await this.enqueue(
      () => this.searchQueue.enqueueIndex(payload.propertyId),
      'index',
      payload.propertyId,
    );
  }

  @OnEvent(PROPERTY_DELETED)
  async onPropertyDeleted(payload: PropertyChangedPayload): Promise<void> {
    await this.enqueue(
      () => this.searchQueue.enqueueDelete(payload.propertyId),
      'delete',
      payload.propertyId,
    );
  }

  /**
   * Event listeners run outside any request context, so a rejected enqueue
   * would otherwise surface only as an unhandled rejection. Log the job id on
   * success and swallow the failure on the caller's behalf — the property write
   * itself already succeeded and must not be rolled back by a queue outage.
   */
  private async enqueue(
    add: () => Promise<{ id?: string }>,
    kind: 'index' | 'delete',
    propertyId: string,
  ): Promise<void> {
    try {
      const job = await add();
      this.logger.debug(
        `Enqueued ${kind} job ${job.id ?? '<no id>'} for property ${propertyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue ${kind} job for property ${propertyId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
