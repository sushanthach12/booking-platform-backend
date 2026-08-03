import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertyDto } from '../../dto/search-property.dto';

@Injectable()
export class AmenitiesFilter implements QueryFilterStrategy<SearchPropertyDto> {
  readonly target = 'filter' as const;

  supports(params: SearchPropertyDto): boolean {
    return !!params.amenities?.length;
  }

  toClause(params: SearchPropertyDto) {
    return { terms: { amenities: params.amenities } };
  }
}
