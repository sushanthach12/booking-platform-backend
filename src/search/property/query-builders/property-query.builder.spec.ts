import { SearchPropertiesDto } from '../../../properties/dto/property-crud.dto';
import { QueryFilterStrategy } from '../../core/interfaces/query-filter-strategy.interface';
import { SortStrategy } from '../../core/interfaces/sort-strategy.interface';
import { PropertyQueryBuilder } from './property-query.builder';

function filter(
  target: 'must' | 'filter' | 'must_not',
  supports: boolean,
  clause: Record<string, any>,
): QueryFilterStrategy<SearchPropertiesDto> {
  return { target, supports: () => supports, toClause: () => clause };
}

function sort(
  priority: number,
  supports: boolean,
  result: Record<string, unknown>[],
): SortStrategy<SearchPropertiesDto> {
  return { priority, supports: () => supports, toSort: () => result };
}

describe('PropertyQueryBuilder', () => {
  it('computes from/size from page and limit', () => {
    const builder = new PropertyQueryBuilder([], []);
    const body = builder.build({ page: 3, limit: 20 } as SearchPropertiesDto);

    expect(body.from).toBe(40);
    expect(body.size).toBe(20);
  });

  it('only includes filters whose supports() returns true, in the right bucket', () => {
    const builder = new PropertyQueryBuilder(
      [
        filter('must', true, { must: 1 }),
        filter('filter', false, { filter: 'excluded' }),
        filter('must_not', true, { must_not: 1 }),
      ],
      [],
    );

    const body: any = builder.build({
      page: 1,
      limit: 10,
    } as SearchPropertiesDto);

    expect(body.query.bool.must).toEqual([{ must: 1 }]);
    expect(body.query.bool.filter).toEqual([]);
    expect(body.query.bool.must_not).toEqual([{ must_not: 1 }]);
  });

  it('picks the lowest-priority applicable sort', () => {
    const builder = new PropertyQueryBuilder(
      [],
      [
        sort(100, true, [{ fallback: 1 }]),
        sort(0, true, [{ distance: 1 }]),
        sort(10, false, [{ price: 1 }]),
      ],
    );

    const body: any = builder.build({
      page: 1,
      limit: 10,
    } as SearchPropertiesDto);

    expect(body.sort).toEqual([{ distance: 1 }]);
  });

  it('attaches amenities/propertyType/priceStats aggregations', () => {
    const builder = new PropertyQueryBuilder([], []);
    const body: any = builder.build({
      page: 1,
      limit: 10,
    } as SearchPropertiesDto);

    expect(body.aggs).toEqual({
      amenities: { terms: { field: 'amenitySlugs' } },
      propertyType: { terms: { field: 'propertyType' } },
      priceStats: { stats: { field: 'basePrice' } },
    });
  });
});
