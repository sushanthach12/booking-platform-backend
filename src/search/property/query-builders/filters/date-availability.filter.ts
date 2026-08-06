import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';

/**
 * A stay of [checkIn, checkOut) conflicts with a blocked range [from, to)
 * exactly when `from < checkOut && to > checkIn` (half-open interval
 * intersection). Placed under `must_not`, so properties with no
 * blockedRanges at all correctly match — `supports` requires BOTH dates so
 * a lone checkIn never silently filters results.
 */
@Injectable()
export class DateAvailabilityFilter implements QueryFilterStrategy<SearchPropertiesDto> {
  readonly target = 'must_not' as const;

  supports(params: SearchPropertiesDto): boolean {
    return !!params.checkIn && !!params.checkOut;
  }

  toClause(params: SearchPropertiesDto) {
    return {
      nested: {
        path: 'blockedRanges',
        query: {
          bool: {
            must: [
              { range: { 'blockedRanges.from': { lt: params.checkOut } } },
              { range: { 'blockedRanges.to': { gt: params.checkIn } } },
            ],
          },
        },
      },
    };
  }
}
