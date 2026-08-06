import { Inject, Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../core/interfaces/query-filter-strategy.interface';
import { SortStrategy } from '../../core/interfaces/sort-strategy.interface';
import { BaseQueryBuilder } from '../../core/query/base-query.builder';
import {
  PROPERTY_HOST_QUERY_FILTERS,
  PROPERTY_HOST_SORT_STRATEGIES,
} from '../../core/search.tokens';
import { HostPropertySearchParams } from '../interfaces/host-property-search.params';

/**
 * Same builder pattern as PropertyQueryBuilder, scoped to a host's own
 * listings. Deliberately has no ActiveStatusFilter or DateAvailabilityFilter
 * registered — a host must be able to find their own drafts and blocked
 * dates, not just what a guest would see.
 */
@Injectable()
export class HostPropertyQueryBuilder extends BaseQueryBuilder<HostPropertySearchParams> {
  constructor(
    @Inject(PROPERTY_HOST_QUERY_FILTERS)
    filters: QueryFilterStrategy<HostPropertySearchParams>[],
    @Inject(PROPERTY_HOST_SORT_STRATEGIES)
    sorts: SortStrategy<HostPropertySearchParams>[],
  ) {
    super(filters, sorts);
  }

  protected aggregations(): Record<string, unknown> | undefined {
    return undefined;
  }
}
