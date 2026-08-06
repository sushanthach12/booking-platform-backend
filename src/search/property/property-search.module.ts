import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PropertyIndexSetupService } from './index/property-index-setup.service';
import { PropertySearchListener } from './listeners/property-search.listener';
import { PropertyDocumentMapper } from './mappers/property-document.mapper';
import { PropertySearchResultMapper } from './mappers/property-search-result.mapper';
import { HostPropertySearchController } from './host-property-search.controller';
import { HostPropertySearchService } from './host-property-search.service';
import { PropertyIndexingService } from './property-indexing.service';
import { PropertySearchController } from './property-search.controller';
import { PropertySearchFacade } from './property-search.facade';
import { PropertySearchService } from './property-search.service';
import { HostPropertyQueryBuilder } from './query-builders/host-property-query.builder';
import { PropertyQueryBuilder } from './query-builders/property-query.builder';
import { PropertySearchQueueService } from './queue/property-search-queue.service';

import { AmenitiesFilter } from './query-builders/filters/amenities.filter';
import { ActiveStatusFilter } from './query-builders/filters/active-status.filter';
import { DateAvailabilityFilter } from './query-builders/filters/date-availability.filter';
import { GeoBoundingBoxFilter } from './query-builders/filters/geo-bounding-box.filter';
import { GeoDistanceFilter } from './query-builders/filters/geo-distance.filter';
import { GuestCapacityFilter } from './query-builders/filters/guest-capacity.filter';
import { LocationTextFilter } from './query-builders/filters/location-text.filter';
import { MinBathroomsFilter } from './query-builders/filters/min-bathrooms.filter';
import { MinBedsFilter } from './query-builders/filters/min-beds.filter';
import { PriceRangeFilter } from './query-builders/filters/price-range.filter';
import { PropertyTypeFilter } from './query-builders/filters/property-type.filter';
import { TextMatchFilter } from './query-builders/filters/text-match.filter';

import { HostCityFilter } from './query-builders/host-filters/host-city.filter';
import { HostPriceRangeFilter } from './query-builders/host-filters/host-price-range.filter';
import { HostPropertyTypeFilter } from './query-builders/host-filters/host-property-type.filter';
import { HostScopeFilter } from './query-builders/host-filters/host-scope.filter';
import { HostStatusFilter } from './query-builders/host-filters/host-status.filter';
import { HostTextMatchFilter } from './query-builders/host-filters/host-text-match.filter';

import { CreatedAtSort } from './query-builders/sorts/created-at.sort';
import { DistanceSort } from './query-builders/sorts/distance.sort';
import { PriceSort } from './query-builders/sorts/price.sort';
import { RatingSort } from './query-builders/sorts/rating.sort';
import { RelevanceSort } from './query-builders/sorts/relevance.sort';

import { HostFieldSort } from './query-builders/host-sorts/host-field.sort';
import { HostRelevanceSort } from './query-builders/host-sorts/host-relevance.sort';

import { PropertyEntityModule } from '../../properties/property.entity.module';
import {
  PROPERTY_HOST_QUERY_FILTERS,
  PROPERTY_HOST_SORT_STRATEGIES,
  PROPERTY_PUBLIC_QUERY_FILTERS,
  PROPERTY_SEARCH_FACADE,
  PROPERTY_SORT_STRATEGIES,
} from '../core/search.tokens';
import { PROPERTY_SEARCH_QUEUE } from './queue/constants';
import { PropertySearchProcessor } from './queue/property-search.processor';

// To add a new public filter/sort: write the class, add it to the
// corresponding array below. Nothing else changes (Open/Closed).
const publicFilterProviders = [
  TextMatchFilter,
  LocationTextFilter,
  PropertyTypeFilter,
  PriceRangeFilter,
  AmenitiesFilter,
  GuestCapacityFilter,
  MinBedsFilter,
  MinBathroomsFilter,
  ActiveStatusFilter,
  DateAvailabilityFilter,
  GeoDistanceFilter,
  GeoBoundingBoxFilter,
];

const publicSortProviders = [
  DistanceSort,
  PriceSort,
  RatingSort,
  CreatedAtSort,
  RelevanceSort,
];

const hostFilterProviders = [
  HostScopeFilter,
  HostTextMatchFilter,
  HostStatusFilter,
  HostPropertyTypeFilter,
  HostPriceRangeFilter,
  HostCityFilter,
];

const hostSortProviders = [HostFieldSort, HostRelevanceSort];

@Module({
  imports: [
    BullModule.registerQueue({
      name: PROPERTY_SEARCH_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: false, // keep failed jobs around for inspection/reprocessing
      },
    }),
    PropertyEntityModule,
  ],
  controllers: [PropertySearchController, HostPropertySearchController],
  providers: [
    ...publicFilterProviders,
    ...publicSortProviders,
    ...hostFilterProviders,
    ...hostSortProviders,
    {
      provide: PROPERTY_PUBLIC_QUERY_FILTERS,
      useFactory: (...filters: unknown[]) => filters,
      inject: publicFilterProviders,
    },
    {
      provide: PROPERTY_SORT_STRATEGIES,
      useFactory: (...sorts: unknown[]) => sorts,
      inject: publicSortProviders,
    },
    {
      provide: PROPERTY_HOST_QUERY_FILTERS,
      useFactory: (...filters: unknown[]) => filters,
      inject: hostFilterProviders,
    },
    {
      provide: PROPERTY_HOST_SORT_STRATEGIES,
      useFactory: (...sorts: unknown[]) => sorts,
      inject: hostSortProviders,
    },
    PropertyDocumentMapper,
    PropertySearchResultMapper,
    PropertyQueryBuilder,
    HostPropertyQueryBuilder,
    PropertyIndexSetupService,
    PropertyIndexingService,
    PropertySearchService,
    HostPropertySearchService,
    {
      provide: PROPERTY_SEARCH_FACADE,
      useClass: PropertySearchFacade,
    },
    PropertySearchListener,
    PropertySearchQueueService,
    PropertySearchProcessor,
  ],
  exports: [PROPERTY_SEARCH_FACADE, PropertySearchResultMapper],
})
export class PropertySearchModule {}
