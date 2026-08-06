import { Inject, Injectable } from '@nestjs/common';
import { ISearchProvider } from '../core/interfaces/search-provider.interface';
import {
  ISearchable,
  SearchOutcome,
} from '../core/interfaces/searchable.interface';
import { SEARCH_PROVIDER } from '../core/search.tokens';
import { PROPERTY_INDEX_ALIAS } from './index/property-index.config';
import { HostPropertySearchParams } from './interfaces/host-property-search.params';
import { PropertyDocument } from './interfaces/property-document.interface';
import { HostPropertyQueryBuilder } from './query-builders/host-property-query.builder';

/**
 * Host-scoped counterpart to PropertySearchService — same read-side
 * responsibility, different query builder (hostId always filtered, drafts
 * included) and no facets.
 */
@Injectable()
export class HostPropertySearchService implements ISearchable<
  HostPropertySearchParams,
  PropertyDocument
> {
  constructor(
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
    private readonly queryBuilder: HostPropertyQueryBuilder,
  ) {}

  async search(
    query: HostPropertySearchParams,
  ): Promise<SearchOutcome<PropertyDocument>> {
    const body = this.queryBuilder.build(query);
    const result = await this.searchProvider.search<PropertyDocument>(
      PROPERTY_INDEX_ALIAS,
      body,
    );

    return {
      total: result.total,
      page: query.page,
      size: query.limit,
      results: result.hits,
    };
  }
}
