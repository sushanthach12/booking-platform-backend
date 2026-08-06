import { Injectable } from '@nestjs/common';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';

/**
 * Used for map-view search (user pans/zooms) rather than radius search.
 * In practice mutually exclusive with GeoDistanceFilter, but the builder
 * doesn't need to know that — each strategy independently decides whether
 * it applies based on which params are present.
 */
@Injectable()
export class GeoBoundingBoxFilter implements QueryFilterStrategy<SearchPropertiesDto> {
  readonly target = 'filter' as const;

  supports(params: SearchPropertiesDto): boolean {
    return [params.neLat, params.neLon, params.swLat, params.swLon].every(
      (v) => v != null,
    );
  }

  toClause(params: SearchPropertiesDto) {
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
