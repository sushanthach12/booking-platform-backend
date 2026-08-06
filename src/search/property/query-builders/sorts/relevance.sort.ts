import { Injectable } from '@nestjs/common';
import { SortStrategy } from '../../../core/interfaces/sort-strategy.interface';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';

/**
 * Fallback — always supports, lowest priority so any more specific sort
 * (distance/price/rating/createdAt) wins when applicable.
 */
@Injectable()
export class RelevanceSort implements SortStrategy<SearchPropertiesDto> {
  readonly priority = 100;

  supports(): boolean {
    return true;
  }

  toSort() {
    return [{ _score: { order: 'desc' } }, { createdAt: { order: 'desc' } }];
  }
}
