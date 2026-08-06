import { Injectable } from '@nestjs/common';
import { SortStrategy } from '../../../core/interfaces/sort-strategy.interface';
import { HostPropertySearchParams } from '../../interfaces/host-property-search.params';

/** Fallback when no sortBy is given — most recently created first. */
@Injectable()
export class HostRelevanceSort implements SortStrategy<HostPropertySearchParams> {
  readonly priority = 100;

  supports(): boolean {
    return true;
  }

  toSort() {
    return [{ createdAt: { order: 'desc' } }];
  }
}
