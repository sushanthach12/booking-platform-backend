import { Injectable } from '@nestjs/common';
import { SearchPropertyDto } from './dto/search-property.dto';
import { IProperyEntity } from './interfaces/property-document.interface';
import { PropertyIndexingService } from './property-indexing.service';
import { PropertySearchService } from './property-search.service';

/**
 * Facade: the single surface controllers/listeners/processors talk to,
 * so they don't need to know there are two separate services underneath
 * with different responsibilities (search vs. indexing).
 */
@Injectable()
export class PropertySearchFacade {
  constructor(
    private readonly searchService: PropertySearchService,
    private readonly indexingService: PropertyIndexingService,
  ) {}

  search(query: SearchPropertyDto) {
    return this.searchService.search(query);
  }

  indexOne(property: IProperyEntity) {
    return this.indexingService.indexOne(property);
  }

  indexMany(properties: IProperyEntity[]) {
    return this.indexingService.indexMany(properties);
  }

  remove(id: string) {
    return this.indexingService.remove(id);
  }
}
