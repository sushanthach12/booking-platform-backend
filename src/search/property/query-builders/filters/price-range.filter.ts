import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';

@Injectable()
export class PriceRangeFilter implements QueryFilterStrategy<SearchPropertiesDto> {
  readonly target = 'filter' as const;

  supports(params: SearchPropertiesDto): boolean {
    return params.minPrice != null || params.maxPrice != null;
  }

  toClause(params: SearchPropertiesDto) {
    const range: Record<string, number> = {};
    if (params.minPrice != null) range.gte = params.minPrice;
    if (params.maxPrice != null) range.lte = params.maxPrice;
    return { range: { basePrice: range } };
  }
}
