import { Injectable } from '@nestjs/common';
import { SortStrategy } from '../../../core/interfaces/sort-strategy.interface';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';

@Injectable()
export class PriceSort implements SortStrategy<SearchPropertiesDto> {
  readonly priority = 10;

  supports(params: SearchPropertiesDto): boolean {
    return params.sortBy === 'price';
  }

  toSort(params: SearchPropertiesDto) {
    return [{ basePrice: { order: params.sortOrder ?? 'desc' } }];
  }
}
