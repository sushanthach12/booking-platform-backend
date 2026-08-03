import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertyDto } from '../../dto/search-property.dto';

@Injectable()
export class GeoDistanceFilter implements QueryFilterStrategy<SearchPropertyDto> {
  readonly target = 'filter' as const;

  supports(params: SearchPropertyDto): boolean {
    return params.lat != null && params.lon != null && params.radiusKm != null;
  }

  toClause(params: SearchPropertyDto) {
    return {
      geo_distance: {
        distance: `${params.radiusKm}km`,
        location: { lat: params.lat, lon: params.lon },
      },
    };
  }
}
