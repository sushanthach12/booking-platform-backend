import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { HostPropertySearchParams } from '../../interfaces/host-property-search.params';

/**
 * Always applied — hostId comes from the JWT (see HostPropertySearchController),
 * never from client input, so every host search is scoped to their own
 * listings regardless of what other filters run.
 */
@Injectable()
export class HostScopeFilter implements QueryFilterStrategy<HostPropertySearchParams> {
  readonly target = 'filter' as const;

  supports(): boolean {
    return true;
  }

  toClause(params: HostPropertySearchParams) {
    return { term: { hostId: params.hostId } };
  }
}
