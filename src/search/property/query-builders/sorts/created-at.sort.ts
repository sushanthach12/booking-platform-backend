import { Injectable } from '@nestjs/common';
import { SortStrategy } from '../../../core/interfaces/sort-strategy.interface';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';

@Injectable()
export class CreatedAtSort implements SortStrategy<SearchPropertiesDto> {
  readonly priority = 10;

  supports(params: SearchPropertiesDto): boolean {
    return params.sortBy === 'created_at';
  }

  toSort(params: SearchPropertiesDto) {
    return [{ createdAt: { order: params.sortOrder ?? 'desc' } }];
  }
}
