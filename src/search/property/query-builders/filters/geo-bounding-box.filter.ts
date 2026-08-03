import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertyDto } from '../../dto/search-property.dto';

/**
 * Used for map-view search (user pans/zooms) rather than radius search.
 * In practice mutually exclusive with GeoDistanceFilter, but the builder
 * doesn't need to know that — each strategy independently decides whether
 * it applies based on which params are present.
 */
@Injectable()
export class GeoBoundingBoxFilter implements QueryFilterStrategy<SearchPropertyDto> {
  readonly target = 'filter' as const;

  supports(params: SearchPropertyDto): boolean {
    return [params.neLat, params.neLon, params.swLat, params.swLon].every(
      (v) => v != null,
    );
  }

  toClause(params: SearchPropertyDto) {
    return {
      geo_bounding_box: {
        location: {
          top_left: { lat: params.neLat, lon: params.swLon },
          bottom_right: { lat: params.swLat, lon: params.neLon },
        },
      },
    };
  }
}
