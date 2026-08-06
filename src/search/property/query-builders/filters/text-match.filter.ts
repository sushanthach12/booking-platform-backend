import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';

@Injectable()
export class TextMatchFilter implements QueryFilterStrategy<SearchPropertiesDto> {
  readonly target = 'must' as const;

  supports(params: SearchPropertiesDto): boolean {
    return !!params.query;
  }

  toClause(params: SearchPropertiesDto) {
    return {
      multi_match: {
        query: params.query,
        fields: ['title^3', 'city.text^2', 'country', 'state', 'description'],
        fuzziness: 'AUTO',
      },
    };
  }
}
