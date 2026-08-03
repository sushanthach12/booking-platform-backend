import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertyDto } from '../../dto/search-property.dto';

@Injectable()
export class CityFilter implements QueryFilterStrategy<SearchPropertyDto> {
  readonly target = 'filter' as const;

  supports(params: SearchPropertyDto): boolean {
    return !!params.city;
  }

  toClause(params: SearchPropertyDto) {
    return { term: { city: params.city } };
  }
}
