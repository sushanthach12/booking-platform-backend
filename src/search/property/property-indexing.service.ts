import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITY_CALENDAR_REPOSITORY,
  PROPERTY_REPOSITORY,
} from '../../database';
import { IAvailabilityCalendarRepository } from '../../properties/repositories/interfaces/availability-calendar.repository.interface';
import { IPropertyRepository } from '../../properties/repositories/interfaces/property-repository.interfaces';
import { IIndexable } from '../core/interfaces/indexable.interface';
import { ISearchProvider } from '../core/interfaces/search-provider.interface';
import { SEARCH_PROVIDER } from '../core/search.tokens';
import { PROPERTY_INDEX_ALIAS } from './index/property-index.config';
import { PropertyDocument } from './interfaces/property-document.interface';
import { collapseBlockedDates } from './mappers/blocked-range.mapper';
import { PropertyDocumentMapper } from './mappers/property-document.mapper';

const startOfToday = (): Date => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};

/**
 * Single responsibility: keep the OpenSearch index in sync with Property
 * entities. Knows nothing about queues, events, or HTTP — just indexing.
 * Fetches fresh from Postgres by id rather than trusting a caller-supplied
 * entity, so the processor and the backfill job share exactly one code path
 * for building a document (this is where the old amenities/rating bug lived).
 */
@Injectable()
export class PropertyIndexingService implements IIndexable<string> {
  constructor(
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    @Inject(AVAILABILITY_CALENDAR_REPOSITORY)
    private readonly availabilityCalendarRepository: IAvailabilityCalendarRepository,
    private readonly mapper: PropertyDocumentMapper,
  ) {}

  async buildDocument(propertyId: string): Promise<PropertyDocument | null> {
    const [property, blockedDates] = await Promise.all([
      this.propertyRepository.findPropertyForIndexing({ id: propertyId }),
      this.availabilityCalendarRepository.findBlockedDates({
        propertyId,
        from: startOfToday(),
      }),
    ]);

    if (!property) return null;

    const blockedRanges = collapseBlockedDates(blockedDates);
    return this.mapper.toDocument(property, blockedRanges);
  }

  /** Rebuilds and upserts a single property's document; removes it if the property no longer exists. */
  async indexOne(propertyId: string): Promise<void> {
    const doc = await this.buildDocument(propertyId);
    if (!doc) {
      await this.remove(propertyId);
      return;
    }
    await this.searchProvider.index(PROPERTY_INDEX_ALIAS, doc.id, doc);
  }

  async indexMany(propertyIds: string[]): Promise<void> {
    const docs = await Promise.all(
      propertyIds.map((id) => this.buildDocument(id)),
    );
    const requests = docs
      .filter((doc): doc is PropertyDocument => doc != null)
      .map((doc) => ({ id: doc.id, document: doc }));

    await this.searchProvider.bulkIndex(PROPERTY_INDEX_ALIAS, requests);
  }

  async remove(id: string): Promise<void> {
    await this.searchProvider.delete(PROPERTY_INDEX_ALIAS, id);
  }
}
