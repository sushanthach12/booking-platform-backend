import { QueryFilterStrategy } from '../interfaces/query-filter-strategy.interface';
import { SortStrategy } from '../interfaces/sort-strategy.interface';

/**
 * Builder pattern: assembles an OpenSearch request body from whatever
 * filter/sort strategies a subclass is constructed with. Domain-agnostic —
 * PropertyQueryBuilder and HostPropertyQueryBuilder both extend this, and a
 * future BookingQueryBuilder can reuse it without touching this file
 * (Open/Closed). Subclasses only supply their own aggregation block.
 */
export abstract class BaseQueryBuilder<
  TParams extends { page?: number; limit?: number },
> {
  protected constructor(
    private readonly filters: QueryFilterStrategy<TParams>[],
    private readonly sorts: SortStrategy<TParams>[] = [],
  ) {}

  protected abstract aggregations(
    params: TParams,
  ): Record<string, unknown> | undefined;

  build(params: TParams): Record<string, unknown> {
    const must: Record<string, unknown>[] = [];
    const filter: Record<string, unknown>[] = [];
    const mustNot: Record<string, unknown>[] = [];

    for (const strategy of this.filters) {
      if (!strategy.supports(params)) continue;
      const clause = strategy.toClause(params);
      const bucket =
        strategy.target === 'must'
          ? must
          : strategy.target === 'must_not'
            ? mustNot
            : filter;
      bucket.push(clause);
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const body: Record<string, unknown> = {
      from: (page - 1) * limit,
      size: limit,
      query: { bool: { must, filter, must_not: mustNot } },
    };

    const sort = this.resolveSort(params);
    if (sort) body.sort = sort;

    const aggs = this.aggregations(params);
    if (aggs) body.aggs = aggs;

    return body;
  }

  private resolveSort(params: TParams): Record<string, unknown>[] | undefined {
    const applicable = this.sorts
      .filter((s) => s.supports(params))
      .sort((a, b) => a.priority - b.priority);

    return applicable.length ? applicable[0].toSort(params) : undefined;
  }
}
