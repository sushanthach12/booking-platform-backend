import { Inject, Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertyDto } from '../dto/search-property.dto';
import { PROPERTY_QUERY_FILTERS } from '../../core/search.tokens';

/**
 * Builder pattern: assembles the final OpenSearch request body from
 * whatever filter strategies are registered. Open for extension — add a
 * new QueryFilterStrategy and register it in the module — closed for
 * modification, since this class never changes when a filter is added.
 */
@Injectable()
export class PropertyQueryBuilder {
  constructor(
    @Inject(PROPERTY_QUERY_FILTERS)
    private readonly filters: QueryFilterStrategy<SearchPropertyDto>[],
  ) {}

  build(params: SearchPropertyDto): Record<string, any> {
    const must: Record<string, any>[] = [];
    const filter: Record<string, any>[] = [];

    for (const strategy of this.filters) {
      if (!strategy.supports(params)) continue;
      const clause = strategy.toClause(params);
      (strategy.target === 'must' ? must : filter).push(clause);
    }

    const body: Record<string, any> = {
      from: (params.page - 1) * params.size,
      size: params.size,
      query: { bool: { must, filter } },
      aggs: {
        amenities: { terms: { field: 'amenities' } },
        propertyType: { terms: { field: 'propertyType' } },
      },
    };

    // Sort by proximity only makes sense for radius search
    if (params.lat != null && params.lon != null && params.radiusKm != null) {
      body.sort = [
        {
          _geo_distance: {
            location: { lat: params.lat, lon: params.lon },
            order: 'asc',
            unit: 'km',
          },
        },
      ];
    }

    return body;
  }
}
