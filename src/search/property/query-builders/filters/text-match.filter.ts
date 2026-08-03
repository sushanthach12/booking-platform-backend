import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertyDto } from '../../dto/search-property.dto';

@Injectable()
export class TextMatchFilter implements QueryFilterStrategy<SearchPropertyDto> {
  readonly target = 'must' as const;

  supports(params: SearchPropertyDto): boolean {
    return !!params.q;
  }

  toClause(params: SearchPropertyDto) {
    return {
      multi_match: {
        query: params.q,
        fields: ['title^3', 'description', 'city^2'],
        fuzziness: 'AUTO',
      },
    };
  }
}
