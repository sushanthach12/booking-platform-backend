import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IProperyEntity } from '../interfaces/property-document.interface';
import { PropertySearchQueueService } from '../queue/property-search-queue.service';
// Adjust this import to your actual entity path

/**
 * Observer pattern via NestJS EventEmitter: decouples property CRUD from
 * search indexing. PropertyService fires domain events and knows nothing
 * about search; this listener reacts and hands off to the queue so the
 * indexing failure/retry never blocks the CRUD transaction.
 */
@Injectable()
export class PropertySearchListener {
  constructor(private readonly searchQueue: PropertySearchQueueService) {}

  @OnEvent('property.created')
  @OnEvent('property.updated')
  onPropertyChanged(property: IProperyEntity) {
    this.searchQueue.enqueueIndex(property.id);
  }

  @OnEvent('property.deleted')
  onPropertyDeleted(property: IProperyEntity) {
    this.searchQueue.enqueueDelete(property.id);
  }
}
