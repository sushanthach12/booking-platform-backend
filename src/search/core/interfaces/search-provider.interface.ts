export interface IndexRequest<T> {
  id: string;
  document: T;
}

export interface SearchResult<T> {
  total: number;
  hits: T[];
  aggregations?: Record<string, any>;
}

/**
 * Provider-agnostic contract for a search backend. Anything that can index
 * and search documents (OpenSearch, Elasticsearch, Algolia...) can implement
 * this without the rest of the app knowing which one is behind it.
 *
 * This is the Dependency Inversion boundary: every service in the property
 * module depends on ISearchProvider, never on the OpenSearch SDK directly.
 */
export interface ISearchProvider {
  index<T>(
    indexName: string,
    id: string,
    document: T,
    refresh?: boolean,
  ): Promise<void>;
  bulkIndex<T>(
    indexName: string,
    docs: IndexRequest<T>[],
    refresh?: boolean,
  ): Promise<void>;
  delete(indexName: string, id: string): Promise<void>;
  search<T>(
    indexName: string,
    body: Record<string, any>,
  ): Promise<SearchResult<T>>;
  createIndex(indexName: string, body: Record<string, any>): Promise<void>;
  indexExists(indexName: string): Promise<boolean>;
  /** Points `alias` at `indexName`, atomically removing it from any other index. */
  putAlias(indexName: string, alias: string): Promise<void>;
  /** Returns the concrete index name(s) an alias currently points at. */
  getAliasTargets(alias: string): Promise<string[]>;
  putMapping(indexName: string, properties: Record<string, any>): Promise<void>;
}
