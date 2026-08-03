export interface SearchOutcome<TDoc> {
  total: number;
  page: number;
  size: number;
  results: TDoc[];
  facets?: Record<string, any>;
}

/**
 * Read-side contract. Any domain (properties, and later maybe hosts,
 * reviews, etc.) implements this the same way, so consumers of search
 * results have a predictable shape regardless of what's being searched.
 */
export interface ISearchable<TQuery, TDoc> {
  search(query: TQuery): Promise<SearchOutcome<TDoc>>;
}
