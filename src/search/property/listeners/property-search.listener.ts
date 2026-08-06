import { Injectable } from '@nestjs/common';
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
 * originating transaction. `enqueueIndex` sets a stable jobId per property,
 * so a burst of edits collapses into one indexing job.
 */
@Injectable()
export class PropertySearchListener {
  constructor(private readonly searchQueue: PropertySearchQueueService) {}

  @OnEvent(PROPERTY_CREATED)
  @OnEvent(PROPERTY_UPDATED)
  @OnEvent(PROPERTY_AVAILABILITY_CHANGED)
  onPropertyChanged(payload: PropertyChangedPayload) {
    this.searchQueue.enqueueIndex(payload.propertyId);
  }

  @OnEvent(PROPERTY_DELETED)
  onPropertyDeleted(payload: PropertyChangedPayload) {
    this.searchQueue.enqueueDelete(payload.propertyId);
  }
}
