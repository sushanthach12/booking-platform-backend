import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { HostPropertySearchParams } from '../../interfaces/host-property-search.params';

@Injectable()
export class HostTextMatchFilter implements QueryFilterStrategy<HostPropertySearchParams> {
  readonly target = 'must' as const;

  supports(params: HostPropertySearchParams): boolean {
    return !!params.q;
  }

  toClause(params: HostPropertySearchParams) {
    return {
      multi_match: {
        query: params.q,
        fields: ['title^3', 'city.text^2', 'description'],
        fuzziness: 'AUTO',
      },
    };
  }
}
