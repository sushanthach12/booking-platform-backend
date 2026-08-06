import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { HostPropertySearchParams } from '../../interfaces/host-property-search.params';

@Injectable()
export class HostPriceRangeFilter implements QueryFilterStrategy<HostPropertySearchParams> {
  readonly target = 'filter' as const;

  supports(params: HostPropertySearchParams): boolean {
    return params.minPrice != null || params.maxPrice != null;
  }

  toClause(params: HostPropertySearchParams) {
    const range: Record<string, number> = {};
    if (params.minPrice != null) range.gte = params.minPrice;
    if (params.maxPrice != null) range.lte = params.maxPrice;
    return { range: { basePrice: range } };
  }
}
