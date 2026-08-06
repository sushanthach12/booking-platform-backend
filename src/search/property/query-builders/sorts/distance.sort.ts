import { Injectable } from '@nestjs/common';
import { SortStrategy } from '../../../core/interfaces/sort-strategy.interface';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';

@Injectable()
export class DistanceSort implements SortStrategy<SearchPropertiesDto> {
  readonly priority = 0;

  supports(params: SearchPropertiesDto): boolean {
    return (
      params.latitude != null &&
      params.longitude != null &&
      params.radius != null
    );
  }

  toSort(params: SearchPropertiesDto) {
    return [
      {
        _geo_distance: {
          location: { lat: params.latitude, lon: params.longitude },
          order: 'asc',
          unit: 'km',
        },
      },
    ];
  }
}
