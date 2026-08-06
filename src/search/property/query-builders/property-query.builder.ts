import { Inject, Injectable } from '@nestjs/common';
import { SearchPropertiesDto } from '../../../properties/dto/property-crud.dto';
import { QueryFilterStrategy } from '../../core/interfaces/query-filter-strategy.interface';
import { SortStrategy } from '../../core/interfaces/sort-strategy.interface';
import { BaseQueryBuilder } from '../../core/query/base-query.builder';
import {
  PROPERTY_PUBLIC_QUERY_FILTERS,
  PROPERTY_SORT_STRATEGIES,
} from '../../core/search.tokens';

/**
 * Builder pattern: assembles the public search request body from whatever
 * filter/sort strategies are registered. Open for extension — add a new
 * QueryFilterStrategy/SortStrategy and register it in the module — closed
 * for modification, since this class never changes when one is added.
 */
@Injectable()
export class PropertyQueryBuilder extends BaseQueryBuilder<SearchPropertiesDto> {
  constructor(
    @Inject(PROPERTY_PUBLIC_QUERY_FILTERS)
    filters: QueryFilterStrategy<SearchPropertiesDto>[],
    @Inject(PROPERTY_SORT_STRATEGIES)
    sorts: SortStrategy<SearchPropertiesDto>[],
  ) {
    super(filters, sorts);
  }

  protected aggregations(): Record<string, unknown> {
    return {
      amenities: { terms: { field: 'amenitySlugs' } },
      propertyType: { terms: { field: 'propertyType' } },
      priceStats: { stats: { field: 'basePrice' } },
    };
  }
}
