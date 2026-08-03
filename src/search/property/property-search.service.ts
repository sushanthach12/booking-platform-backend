import { Inject, Injectable } from '@nestjs/common';
import { ISearchProvider } from '../core/interfaces/search-provider.interface';
import {
  ISearchable,
  SearchOutcome,
} from '../core/interfaces/searchable.interface';
import { SEARCH_PROVIDER } from '../core/search.tokens';
import { SearchPropertyDto } from './dto/search-property.dto';
import { PROPERTY_INDEX_NAME } from './index/property-index.config';
import { PropertyDocument } from './interfaces/property-document.interface';
import { PropertyQueryBuilder } from './query-builders/property-query.builder';

/**
 * Single responsibility: turn a SearchPropertyDto into a search result.
 * Delegates query construction to PropertyQueryBuilder and execution to
 * the ISearchProvider abstraction — this class has no idea it's talking
 * to OpenSearch specifically.
 */
@Injectable()
export class PropertySearchService implements ISearchable<
  SearchPropertyDto,
  PropertyDocument
> {
  constructor(
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
    private readonly queryBuilder: PropertyQueryBuilder,
  ) {}

  async search(
    query: SearchPropertyDto,
  ): Promise<SearchOutcome<PropertyDocument>> {
    const body = this.queryBuilder.build(query);
    const result = await this.searchProvider.search<PropertyDocument>(
      PROPERTY_INDEX_NAME,
      body,
    );

    return {
      total: result.total,
      page: query.page,
      size: query.size,
      results: result.hits,
      facets: result.aggregations,
    };
  }
}
