import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertyDto } from '../../dto/search-property.dto';

@Injectable()
export class PriceRangeFilter implements QueryFilterStrategy<SearchPropertyDto> {
  readonly target = 'filter' as const;

  supports(params: SearchPropertyDto): boolean {
    return params.minPrice != null || params.maxPrice != null;
  }

  toClause(params: SearchPropertyDto) {
    const range: Record<string, number> = {};
    if (params.minPrice != null) range.gte = params.minPrice;
    if (params.maxPrice != null) range.lte = params.maxPrice;
    return { range: { pricePerNight: range } };
  }
}
