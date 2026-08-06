/**
 * Strategy pattern for sort resolution — mirrors QueryFilterStrategy. Without
 * this, "how do I sort" ends up as an if/else chain hardcoded into the query
 * builder (see the old geo-sort block in PropertyQueryBuilder). Each concrete
 * sort decides for itself whether it applies; the builder just asks every
 * registered strategy and takes the highest-priority match.
 */
export interface SortStrategy<TParams> {
  /** Lower runs first when several strategies apply. */
  readonly priority: number;
  supports(params: TParams): boolean;
  toSort(params: TParams): Record<string, unknown>[];
}
