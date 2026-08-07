import { Injectable } from '@nestjs/common';
import { SearchPropertiesDto } from '../../properties/dto/property-crud.dto';
import { HostPropertySearchService } from './host-property-search.service';
import { HostPropertySearchParams } from './interfaces/host-property-search.params';
import { IPropertySearchFacade } from './interfaces/property-search-facade.interface';
import { PropertyDestinationsService } from './property-destinations.service';
import { PropertyIndexingService } from './property-indexing.service';
import { PropertySearchService } from './property-search.service';

/**
 * Facade: the single surface controllers/listeners/processors talk to,
 * so they don't need to know there are separate services underneath
 * with different responsibilities (public search, host search, indexing).
 */
@Injectable()
export class PropertySearchFacade implements IPropertySearchFacade {
  constructor(
    private readonly searchService: PropertySearchService,
    private readonly hostSearchService: HostPropertySearchService,
    private readonly indexingService: PropertyIndexingService,
    private readonly destinationsService: PropertyDestinationsService,
  ) {}

  search(query: SearchPropertiesDto) {
    return this.searchService.search(query);
  }

  searchForHost(params: HostPropertySearchParams) {
    return this.hostSearchService.search(params);
  }

  aggregateDestinations(limit: number) {
    return this.destinationsService.aggregate(limit);
  }

  indexById(propertyId: string) {
    return this.indexingService.indexOne(propertyId);
  }

  indexMany(propertyIds: string[]) {
    return this.indexingService.indexMany(propertyIds);
  }

  remove(id: string) {
    return this.indexingService.remove(id);
  }
}
