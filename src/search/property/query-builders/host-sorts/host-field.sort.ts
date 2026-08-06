import { Injectable } from '@nestjs/common';
import { SortStrategy } from '../../../core/interfaces/sort-strategy.interface';
import { HostPropertySearchParams } from '../../interfaces/host-property-search.params';

const FIELD_BY_SORT_BY: Record<
  NonNullable<HostPropertySearchParams['sortBy']>,
  string
> = {
  price: 'basePrice',
  rating: 'rating',
  createdAt: 'createdAt',
};

/**
 * One strategy handles all three field sorts — price/rating/createdAt only
 * differ by which document field they sort on, so there's no need for
 * three near-identical classes the way the public builder has (those also
 * carry per-field default order nuance the host list doesn't need).
 */
@Injectable()
export class HostFieldSort implements SortStrategy<HostPropertySearchParams> {
  readonly priority = 10;

  supports(params: HostPropertySearchParams): boolean {
    return !!params.sortBy;
  }

  toSort(params: HostPropertySearchParams) {
    const field = FIELD_BY_SORT_BY[params.sortBy!];
    return [{ [field]: { order: params.sortOrder ?? 'desc' } }];
  }
}
