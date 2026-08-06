import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';

/**
 * Mirrors the Postgres `location` OR-group (city/country/state/addressLine1)
 * so the free-text `location` query param keeps working unchanged.
 */
@Injectable()
export class LocationTextFilter implements QueryFilterStrategy<SearchPropertiesDto> {
  readonly target = 'must' as const;

  supports(params: SearchPropertiesDto): boolean {
    return !!params.location;
  }

  toClause(params: SearchPropertiesDto) {
    return {
      multi_match: {
        query: params.location,
        fields: ['city.text', 'country', 'state', 'addressLine1'],
        type: 'best_fields',
      },
    };
  }
}
