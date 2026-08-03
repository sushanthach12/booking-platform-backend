import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertyDto } from '../../dto/search-property.dto';

/**
 * Always applied — every property search excludes unavailable listings.
 * supports() always returns true, so this always ends up in the filter
 * clause regardless of what params were passed in.
 */
@Injectable()
export class AvailabilityFilter implements QueryFilterStrategy<SearchPropertyDto> {
  readonly target = 'filter' as const;

  supports(): boolean {
    return true;
  }

  toClause() {
    return { term: { isAvailable: true } };
  }
}
