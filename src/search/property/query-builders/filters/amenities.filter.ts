import { Injectable } from '@nestjs/common';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';

/**
 * AND semantics — matches the Postgres `innerJoin` + `IN (...)` behaviour,
 * which requires every listed amenity to be present. A single `terms`
 * clause would be OR and silently change what a multi-amenity search
 * returns, so this is one `term` per amenity under `bool.must`.
 */
@Injectable()
export class AmenitiesFilter implements QueryFilterStrategy<SearchPropertiesDto> {
  readonly target = 'filter' as const;

  supports(params: SearchPropertiesDto): boolean {
    return !!params.amenities?.length;
  }

  toClause(params: SearchPropertiesDto) {
    return {
      bool: {
        must: params.amenities!.map((amenity) => ({
          term: { amenitySlugs: amenity.toLowerCase() },
        })),
      },
    };
  }
}
