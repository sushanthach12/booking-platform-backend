import { Inject, Injectable } from '@nestjs/common';
import { EPropertyStatus } from '../../properties/enums/property.enum';
import { ISearchProvider } from '../core/interfaces/search-provider.interface';
import { SEARCH_PROVIDER } from '../core/search.tokens';
import { PROPERTY_INDEX_NAME } from './index/property-index.config';
import { PropertyDestination } from './interfaces/property-destination.interface';

interface CityBucket {
  key: string;
  doc_count: number;
  fromPrice: { value: number | null };
  sample: {
    hits: {
      hits: {
        _source: {
          city: string;
          state: string | null;
          country: string;
          currency: string;
          coverImage: string | null;
        };
      }[];
    };
  };
}

/**
 * City-level destination tiles via a single `size: 0` terms aggregation on
 * `city`, so counts/prices reflect the same active-listing index the search
 * page queries — unlike the old in-memory grouping over a 50-row Postgres pool.
 */
@Injectable()
export class PropertyDestinationsService {
  constructor(
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
  ) {}

  async aggregate(limit: number): Promise<PropertyDestination[]> {
    const result = await this.searchProvider.search<never>(
      PROPERTY_INDEX_NAME,
      {
        size: 0,
        query: {
          bool: { filter: [{ term: { status: EPropertyStatus.ACTIVE } }] },
        },
        aggs: {
          cities: {
            terms: { field: 'city', size: limit, order: { _count: 'desc' } },
            aggs: {
              fromPrice: { min: { field: 'basePrice' } },
              sample: {
                top_hits: {
                  size: 1,
                  _source: {
                    includes: [
                      'city',
                      'state',
                      'country',
                      'currency',
                      'coverImage',
                    ],
                  },
                },
              },
            },
          },
        },
      },
    );

    const buckets = (result.aggregations?.cities?.buckets ??
      []) as CityBucket[];

    return buckets.map((bucket) => {
      const source = bucket.sample.hits.hits[0]?._source;
      return {
        city: source?.city ?? bucket.key,
        state: source?.state ?? undefined,
        country: source?.country ?? undefined,
        propertyCount: bucket.doc_count,
        fromPrice: bucket.fromPrice.value ?? null,
        currency: source?.currency ?? null,
        coverImage: source?.coverImage ?? null,
      };
    });
  }
}
