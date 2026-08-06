import { SearchPropertiesDto } from '../../../../properties/dto/property-crud.dto';
import { AmenitiesFilter } from './amenities.filter';

describe('AmenitiesFilter', () => {
  const filter = new AmenitiesFilter();

  it('does not support an empty/missing amenities list', () => {
    expect(filter.supports({} as SearchPropertiesDto)).toBe(false);
    expect(filter.supports({ amenities: [] } as SearchPropertiesDto)).toBe(
      false,
    );
  });

  it('builds an AND clause — one term per amenity under bool.must', () => {
    const params = { amenities: ['WiFi', 'Pool'] } as SearchPropertiesDto;

    expect(filter.toClause(params)).toEqual({
      bool: {
        must: [
          { term: { amenitySlugs: 'wifi' } },
          { term: { amenitySlugs: 'pool' } },
        ],
      },
    });
  });
});
