import { PropertyEntity } from '../../../properties/entities/property.entity';
import {
  EPropertyStatus,
  EPropertyType,
} from '../../../properties/enums/property.enum';
import { PropertyDocumentMapper } from './property-document.mapper';

function buildProperty(
  overrides: Partial<PropertyEntity> = {},
): PropertyEntity {
  return {
    id: 'prop-1',
    hostId: 'host-1',
    slug: 'test-listing',
    title: 'Test Listing',
    description: 'A nice place',
    propertyType: EPropertyType.APARTMENT,
    status: EPropertyStatus.ACTIVE,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-02T00:00:00Z'),
    location: null as any,
    pricing: null as any,
    details: null as any,
    policies: null as any,
    ratings: null as any,
    rooms: [],
    amenities: [],
    images: [],
    houseRules: [],
    availability: [],
    ...overrides,
  } as PropertyEntity;
}

describe('PropertyDocumentMapper', () => {
  const mapper = new PropertyDocumentMapper();

  it('coerces decimal-string columns into numbers', () => {
    const property = buildProperty({
      pricing: {
        basePrice: '1250.50',
        currency: 'INR',
        cleaningFee: '75.00',
      } as any,
      details: { maxGuests: 4, bedrooms: 2, beds: 3, bathrooms: '1.5' } as any,
      ratings: { averageRating: '4.20', totalReviews: 12 } as any,
      location: {
        city: 'Goa',
        state: 'Goa',
        country: 'India',
        addressLine1: 'Beach Rd',
        latitude: '15.2993',
        longitude: '74.1240',
      } as any,
    });

    const doc = mapper.toDocument(property, []);

    expect(doc.basePrice).toBe(1250.5);
    expect(doc.cleaningFee).toBe(75);
    expect(doc.bathrooms).toBe(1.5);
    expect(doc.rating).toBe(4.2);
    expect(doc.location).toEqual({ lat: 15.2993, lon: 74.124 });
  });

  it('emits null location when coordinates are absent, rather than 0,0', () => {
    const property = buildProperty({
      location: {
        city: 'Goa',
        state: null,
        country: 'India',
        addressLine1: 'Beach Rd',
        latitude: null,
        longitude: null,
      } as any,
    });

    const doc = mapper.toDocument(property, []);

    expect(doc.location).toBeNull();
  });

  it('maps amenities and lowercases amenitySlugs', () => {
    const property = buildProperty({
      amenities: [
        { amenity: { name: 'WiFi' } } as any,
        { amenity: { name: 'Pool' } } as any,
        { amenity: null } as any,
      ],
    });

    const doc = mapper.toDocument(property, []);

    expect(doc.amenities).toEqual(['WiFi', 'Pool']);
    expect(doc.amenitySlugs).toEqual(['wifi', 'pool']);
  });

  it('prefers the primary image for coverImage, falling back to the first', () => {
    const withPrimary = buildProperty({
      images: [
        { url: 'a.jpg', isPrimary: false, thumbnailUrl: null } as any,
        { url: 'b.jpg', isPrimary: true, thumbnailUrl: 'b-thumb.jpg' } as any,
      ],
    });
    expect(mapper.toDocument(withPrimary, []).coverImage).toBe('b.jpg');

    const withoutPrimary = buildProperty({
      images: [{ url: 'a.jpg', isPrimary: false, thumbnailUrl: null } as any],
    });
    expect(mapper.toDocument(withoutPrimary, []).coverImage).toBe('a.jpg');

    const withNoImages = buildProperty({ images: [] });
    expect(mapper.toDocument(withNoImages, []).coverImage).toBeNull();
  });
});
