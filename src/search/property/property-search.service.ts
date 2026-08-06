import { Inject, Injectable } from '@nestjs/common';
import { SearchPropertiesDto } from '../../properties/dto/property-crud.dto';
import { ISearchProvider } from '../core/interfaces/search-provider.interface';
import {
  ISearchable,
  SearchOutcome,
} from '../core/interfaces/searchable.interface';
import { SEARCH_PROVIDER } from '../core/search.tokens';
import { PROPERTY_INDEX_ALIAS } from './index/property-index.config';
import { PropertyDocument } from './interfaces/property-document.interface';
import { PropertyQueryBuilder } from './query-builders/property-query.builder';

/**
 * Single responsibility: turn a SearchPropertiesDto into a search result.
 * Delegates query construction to PropertyQueryBuilder and execution to
 * the ISearchProvider abstraction — this class has no idea it's talking
 * to OpenSearch specifically.
 */
@Injectable()
export class PropertySearchService implements ISearchable<
  SearchPropertiesDto,
  PropertyDocument
> {
  constructor(
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
    private readonly queryBuilder: PropertyQueryBuilder,
  ) {}

  async search(
    query: SearchPropertiesDto,
  ): Promise<SearchOutcome<PropertyDocument>> {
    const body = this.queryBuilder.build(query);
    const result = await this.searchProvider.search<PropertyDocument>(
      PROPERTY_INDEX_ALIAS,
      body,
    );

    return {
      total: result.total,
      page: query.page ?? 1,
      size: query.limit ?? 10,
      results: result.hits,
      facets: result.aggregations,
    };
  }
}
