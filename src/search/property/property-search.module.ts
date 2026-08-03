import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PropertyIndexSetupService } from './index/property-index-setup.service';
import { PropertySearchListener } from './listeners/property-search.listener';
import { PropertyDocumentMapper } from './mappers/property-document.mapper';
import { PropertyIndexingService } from './property-indexing.service';
import { PropertySearchController } from './property-search.controller';
import { PropertySearchFacade } from './property-search.facade';
import { PropertySearchService } from './property-search.service';
import { PropertyQueryBuilder } from './query-builders/property-query.builder';
import { PropertySearchQueueService } from './queue/property-search-queue.service';

import { AmenitiesFilter } from './query-builders/filters/amenities.filter';
import { AvailabilityFilter } from './query-builders/filters/availability.filter';
import { CityFilter } from './query-builders/filters/city.filter';
import { GeoBoundingBoxFilter } from './query-builders/filters/geo-bounding-box.filter';
import { GeoDistanceFilter } from './query-builders/filters/geo-distance.filter';
import { PriceRangeFilter } from './query-builders/filters/price-range.filter';
import { TextMatchFilter } from './query-builders/filters/text-match.filter';

import { PropertyEntityModule } from '../../properties/property.entity.module';
import {
  PROPERTY_QUERY_FILTERS,
  PROPERTY_SEARCH_QUEUE,
} from '../core/search.tokens';
import { PropertySearchProcessor } from './queue/property-search.processor';

// To add a new filter: write the class, add it here. Nothing else changes.
const filterProviders = [
  TextMatchFilter,
  CityFilter,
  PriceRangeFilter,
  AmenitiesFilter,
  AvailabilityFilter,
  GeoDistanceFilter,
  GeoBoundingBoxFilter,
];

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
  controllers: [PropertySearchController],
  providers: [
    ...filterProviders,
    {
      // Collects every registered filter strategy into a single injectable
      // array. PropertyQueryBuilder just receives this list — it never
      // needs to know which concrete filters exist.
      provide: PROPERTY_QUERY_FILTERS,
      useFactory: (...filters: unknown[]) => filters,
      inject: filterProviders,
    },
    PropertyDocumentMapper,
    PropertyQueryBuilder,
    PropertyIndexSetupService,
    PropertyIndexingService,
    PropertySearchService,
    PropertySearchFacade,
    PropertySearchListener,
    PropertySearchQueueService,
    PropertySearchProcessor,
  ],
  exports: [PropertySearchFacade],
})
export class PropertySearchModule {}
