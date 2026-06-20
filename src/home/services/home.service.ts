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
 * It composes existing {@link PropertyService} reads rather than querying the
 * database directly — one listing fetch is sliced/sorted in memory, which is
 * cheap at the homepage's data volume and keeps the persistence layer untouched.
 */
@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  /** Size of the active-listing pool we derive all three rails from. */
  private static readonly POOL_SIZE = 50;
  private static readonly DEFAULT_RAIL_SIZE = 8;
  private static readonly MAX_DESTINATIONS = 8;

  constructor(private readonly propertyService: PropertyService) {}

  async getHomeData(data: IGetHomeRequestParams): Promise<IGetHomeResponse> {
    const railSize = data.params.limit ?? HomeService.DEFAULT_RAIL_SIZE;

    const { results } = await this.propertyService.getProperties({
      payload: { page: 1, limit: HomeService.POOL_SIZE },
    });

    return {
      featured: this.buildFeatured(results, railSize),
      nearby: this.buildNearby(results, railSize, data.params.location),
      destinations: this.buildDestinations(results),
    };
  }

  /** Highest rated listings first, breaking ties by review volume. */
  private buildFeatured(
    pool: IGetPropertiesResult[],
    railSize: number,
  ): IHomePropertySummary[] {
    return [...pool]
      .sort((a, b) => {
        const ratingDelta =
          (b.ratings?.averageRating ?? 0) - (a.ratings?.averageRating ?? 0);
        if (ratingDelta !== 0) return ratingDelta;
        return (b.ratings?.totalReviews ?? 0) - (a.ratings?.totalReviews ?? 0);
      })
      .slice(0, railSize)
      .map((p) => this.toSummary(p));
  }

  /**
   * Most recently listed properties. When a `location` is supplied we narrow to
   * matching cities/states/countries, falling back to the full pool if nothing
   * matches so the rail is never empty.
   */
  private buildNearby(
    pool: IGetPropertiesResult[],
    railSize: number,
    location?: string,
  ): IHomePropertySummary[] {
    let candidates = pool;

    if (location) {
      const needle = location.toLowerCase();
      const matches = pool.filter((p) => {
        if (!p.location) return false;
        const { city, state, country } = p.location;
        return [city, state, country]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(needle));
      });
      if (matches.length > 0) candidates = matches;
    }

    return [...candidates]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, railSize)
      .map((p) => this.toSummary(p));
  }

  /** Group active listings by city into destination tiles. */
  private buildDestinations(pool: IGetPropertiesResult[]): IHomeDestination[] {
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
