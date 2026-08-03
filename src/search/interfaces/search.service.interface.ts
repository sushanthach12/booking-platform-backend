export const SEARCH_SERVICE = Symbol('ISearchService');

export interface ISearchService {
  handleSearch(query: string): Promise<any>;
}
