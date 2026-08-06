import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';
import { DateAvailabilityFilter } from './date-availability.filter';

describe('DateAvailabilityFilter', () => {
  const filter = new DateAvailabilityFilter();

  it('is a must_not clause', () => {
    expect(filter.target).toBe('must_not');
  });

  it('does not support a lone checkIn without checkOut', () => {
    const params = { checkIn: '2025-06-01' } as SearchPropertiesDto;
    expect(filter.supports(params)).toBe(false);
  });

  it('does not support a lone checkOut without checkIn', () => {
    const params = { checkOut: '2025-06-05' } as SearchPropertiesDto;
    expect(filter.supports(params)).toBe(false);
  });

  it('supports when both dates are present', () => {
    const params = {
      checkIn: '2025-06-01',
      checkOut: '2025-06-05',
    } as SearchPropertiesDto;
    expect(filter.supports(params)).toBe(true);
  });

  it('builds a half-open nested intersection clause', () => {
    const params = {
      checkIn: '2025-06-01',
      checkOut: '2025-06-05',
    } as SearchPropertiesDto;

    expect(filter.toClause(params)).toEqual({
      nested: {
        path: 'blockedRanges',
        query: {
          bool: {
            must: [
              { range: { 'blockedRanges.from': { lt: '2025-06-05' } } },
              { range: { 'blockedRanges.to': { gt: '2025-06-01' } } },
            ],
          },
        },
      },
    });
  });
});
