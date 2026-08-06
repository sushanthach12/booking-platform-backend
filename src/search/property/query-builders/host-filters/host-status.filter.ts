import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { HostPropertySearchParams } from '../../interfaces/host-property-search.params';

/**
 * Unlike ActiveStatusFilter on the public builder, this only applies when
 * the host explicitly asks for a status — omitted, a host sees listings in
 * every status including draft.
 */
@Injectable()
export class HostStatusFilter implements QueryFilterStrategy<HostPropertySearchParams> {
  readonly target = 'filter' as const;

  supports(params: HostPropertySearchParams): boolean {
    return !!params.status;
  }

  toClause(params: HostPropertySearchParams) {
    return { term: { status: params.status } };
  }
}
