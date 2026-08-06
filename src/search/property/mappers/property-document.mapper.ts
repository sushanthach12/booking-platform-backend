import { Injectable } from '@nestjs/common';
import {
  EPropertyStatus,
  EPropertyType,
} from '../../../properties/enums/property.enum';
import { PropertyEntity } from '../../../properties/entities/property.entity';
import {
  PropertyBlockedRange,
  PropertyDocument,
} from '../interfaces/property-document.interface';

const toNumber = (value: unknown, fallback = 0): number => {
  if (value == null) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

/**
 * Single responsibility: translate a PropertyEntity (with search relations
 * loaded — see IPropertyRepository.findPropertyForIndexing) into the
 * flattened document shape OpenSearch expects. Postgres returns `decimal`
 * columns as strings via pg, so every numeric field here is explicitly
 * coerced rather than trusted as already-a-number.
 */
@Injectable()
export class PropertyDocumentMapper {
  toDocument(
    property: PropertyEntity,
    blockedRanges: PropertyBlockedRange[],
  ): PropertyDocument {
    const { location, pricing, details, policies, ratings, images, amenities } =
      property;

    const hasCoords = location?.latitude != null && location?.longitude != null;

    const primaryImage =
      images?.find((img) => img.isPrimary) ?? images?.[0] ?? null;

    const amenityNames = (amenities ?? [])
      .map((a) => a.amenity?.name)
      .filter((name): name is string => !!name);

    return {
      id: property.id,
      slug: property.slug,
      hostId: property.hostId,
      status: property.status as EPropertyStatus,

      title: property.title,
      description: property.description ?? '',

      city: location?.city ?? '',
      state: location?.state ?? null,
      country: location?.country ?? '',
      addressLine1: location?.addressLine1 ?? '',
      location: hasCoords
        ? {
            lat: toNumber(location.latitude),
            lon: toNumber(location.longitude),
          }
        : null,

      propertyType: property.propertyType as EPropertyType,

      basePrice: toNumber(pricing?.basePrice),
      currency: pricing?.currency ?? 'INR',
      cleaningFee: toNumber(pricing?.cleaningFee),

      maxGuests: details?.maxGuests ?? 0,
      bedrooms: details?.bedrooms ?? 0,
      beds: details?.beds ?? 0,
      bathrooms: toNumber(details?.bathrooms),

      amenities: amenityNames,
      amenitySlugs: amenityNames.map((name) => name.toLowerCase()),

      rating: toNumber(ratings?.averageRating),
      totalReviews: ratings?.totalReviews ?? 0,

      coverImage: primaryImage?.url ?? null,
      thumbnailUrl: primaryImage?.thumbnailUrl ?? null,

      instantBook: policies?.instantBook ?? false,
      minNights: policies?.minNights ?? 1,
      maxNights: policies?.maxNights ?? 365,
      cancellationPolicy: policies?.cancellationPolicy ?? 'flexible',

      blockedRanges,

      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  }
}
