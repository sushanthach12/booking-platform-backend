import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';

@Injectable()
export class MinBedsFilter implements QueryFilterStrategy<SearchPropertiesDto> {
  readonly target = 'filter' as const;

  supports(params: SearchPropertiesDto): boolean {
    return params.minBeds != null;
  }

  toClause(params: SearchPropertiesDto) {
    return { range: { beds: { gte: params.minBeds } } };
  }
}
