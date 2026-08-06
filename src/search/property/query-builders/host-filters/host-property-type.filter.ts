import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { HostPropertySearchParams } from '../../interfaces/host-property-search.params';

@Injectable()
export class HostPropertyTypeFilter implements QueryFilterStrategy<HostPropertySearchParams> {
  readonly target = 'filter' as const;

  supports(params: HostPropertySearchParams): boolean {
    return !!params.propertyType?.length;
  }

  toClause(params: HostPropertySearchParams) {
    return { terms: { propertyType: params.propertyType } };
  }
}
