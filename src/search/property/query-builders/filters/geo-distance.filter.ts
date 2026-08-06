import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';

@Injectable()
export class GeoDistanceFilter implements QueryFilterStrategy<SearchPropertiesDto> {
  readonly target = 'filter' as const;

  supports(params: SearchPropertiesDto): boolean {
    return (
      params.latitude != null &&
      params.longitude != null &&
      params.radius != null
    );
  }

  toClause(params: SearchPropertiesDto) {
    return {
      geo_distance: {
        distance: `${params.radius}km`,
        location: { lat: params.latitude, lon: params.longitude },
      },
    };
  }
}
