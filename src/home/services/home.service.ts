import { Injectable, Logger } from '@nestjs/common';
import { IGetPropertiesResult } from '../../properties/interfaces/property.interface';
import { PropertyService } from '../../properties/services/property.service';
import {
  IGetHomeRequestParams,
  IGetHomeResponse,
  IHomeDestination,
  IHomePropertySummary,
} from '../interfaces/home.interface';

/**
 * Aggregates everything the marketing homepage needs in a single response:
 * a featured rail (top-rated), a nearby rail (most recent, optionally biased
 * by a location string) and city-level destination tiles.
 *
 * Featured/nearby go through {@link PropertyService.searchProperties} — the
 * same OpenSearch-backed method the search page uses — so both surfaces agree
 * on what's live, how location matching works, and image/price fields.
 * Destinations come from a city aggregation (see {@link PropertyService.getDestinations})
 * with a Postgres-pool fallback if that aggregation fails.
 */
@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  private static readonly DEFAULT_RAIL_SIZE = 8;
  private static readonly MAX_DESTINATIONS = 8;

  constructor(private readonly propertyService: PropertyService) {}

  async getHomeData(data: IGetHomeRequestParams): Promise<IGetHomeResponse> {
    const railSize = data.params.limit ?? HomeService.DEFAULT_RAIL_SIZE;
    const location = data.params.location;

    const [featured, nearby, destinations] = await Promise.all([
      this.propertyService
        .searchProperties({
          payload: {
            page: 1,
            limit: railSize,
            sortBy: 'rating',
            sortOrder: 'desc',
          },
        })
        .then((res) => res.results.map((p) => this.toSummary(p))),
      this.buildNearby(railSize, location),
      this.buildDestinations(),
    ]);

    return { featured, nearby, destinations };
  }

  /**
   * Most recently listed properties, optionally biased by a location string.
   * Falls back to the location-less result set if the biased search comes
   * back empty, so the rail is never empty.
   */
  private async buildNearby(
    railSize: number,
    location?: string,
  ): Promise<IHomePropertySummary[]> {
    const { results } = await this.propertyService.searchProperties({
      payload: {
        page: 1,
        limit: railSize,
        location,
        sortBy: 'created_at',
        sortOrder: 'desc',
      },
    });

    if (results.length > 0 || !location) {
      return results.map((p) => this.toSummary(p));
    }

    const { results: unbiased } = await this.propertyService.searchProperties({
      payload: {
        page: 1,
        limit: railSize,
        sortBy: 'created_at',
        sortOrder: 'desc',
      },
    });
    return unbiased.map((p) => this.toSummary(p));
  }

  /**
   * City-level destination tiles from the OpenSearch terms aggregation. Falls
   * back to grouping a Postgres listing pool in memory if the aggregation
   * fails (e.g. OpenSearch is down).
   */
  private async buildDestinations(): Promise<IHomeDestination[]> {
    try {
      return await this.propertyService.getDestinations(
        HomeService.MAX_DESTINATIONS,
      );
    } catch (error) {
      this.logger.error(
        `Destination aggregation failed, falling back to Postgres pool: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      const { results } = await this.propertyService.getProperties({
        payload: { page: 1, limit: 50 },
      });
      return this.buildDestinationsFromPool(results);
    }
  }

  private buildDestinationsFromPool(
    pool: IGetPropertiesResult[],
  ): IHomeDestination[] {
    const byCity = new Map<string, IHomeDestination>();

    for (const p of pool) {
      const city = p.location?.city;
      if (!city) continue;

      const key = city.toLowerCase();
      const price = p.pricing?.basePrice ?? null;
      const existing = byCity.get(key);

      if (!existing) {
        byCity.set(key, {
          city,
          state: p.location?.state,
          country: p.location?.country,
          propertyCount: 1,
          fromPrice: price,
          currency: p.pricing?.currency ?? null,
          coverImage: p.coverImage ?? null,
        });
        continue;
      }

      existing.propertyCount += 1;
      if (
        price != null &&
        (existing.fromPrice == null || price < existing.fromPrice)
      ) {
        existing.fromPrice = price;
        existing.currency = p.pricing?.currency ?? existing.currency;
      }
      if (!existing.coverImage && p.coverImage) {
        existing.coverImage = p.coverImage;
      }
    }

    return [...byCity.values()]
      .sort((a, b) => b.propertyCount - a.propertyCount)
      .slice(0, HomeService.MAX_DESTINATIONS);
  }

  private toSummary(p: IGetPropertiesResult): IHomePropertySummary {
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      propertyType: p.propertyType,
      coverImage: p.coverImage,
      location: p.location,
      pricing: p.pricing,
      ratings: p.ratings,
    };
  }
}
