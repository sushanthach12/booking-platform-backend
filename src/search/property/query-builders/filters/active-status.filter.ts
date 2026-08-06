import { Injectable } from '@nestjs/common';
import { QueryFilterStrategy } from '../../../core/interfaces/query-filter-strategy.interface';
import { EPropertyStatus } from '../../../../properties/enums/property.enum';
import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';

/**
 * Always applied on the public builder — guests should never see draft,
 * inactive, or deleted listings. Never registered on the host builder,
 * where a host must see their own drafts.
 */
@Injectable()
export class ActiveStatusFilter implements QueryFilterStrategy<SearchPropertiesDto> {
  readonly target = 'filter' as const;

  supports(): boolean {
    return true;
  }

  toClause() {
    return { term: { status: EPropertyStatus.ACTIVE } };
  }
}
