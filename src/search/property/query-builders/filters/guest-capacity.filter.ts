import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';

@Injectable()
export class GuestCapacityFilter implements QueryFilterStrategy<SearchPropertiesDto> {
  readonly target = 'filter' as const;

  supports(params: SearchPropertiesDto): boolean {
    return params.guests != null;
  }

  toClause(params: SearchPropertiesDto) {
    return { range: { maxGuests: { gte: params.guests } } };
  }
}
