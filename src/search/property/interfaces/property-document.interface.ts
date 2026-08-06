import {
  EPropertyStatus,
  EPropertyType,
} from '../../../properties/enums/property.enum';

export interface PropertyBlockedRange {
  /** ISO date, inclusive — first blocked night. */
  from: string;
  /** ISO date, exclusive — the day after the last blocked night. */
  to: string;
}

export interface PropertyDocument {
  id: string;
  slug: string;
  hostId: string;
  status: EPropertyStatus;

  title: string;
  description: string;

  city: string;
  state: string | null;
  country: string;
  addressLine1: string;
  /** null when the property has no coordinates. */
  location: { lat: number; lon: number } | null;

  propertyType: EPropertyType;

  basePrice: number;
  currency: string;
  cleaningFee: number;

  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;

  amenities: string[];
  amenitySlugs: string[];

  rating: number;
  totalReviews: number;

  coverImage: string | null;
  thumbnailUrl: string | null;

  instantBook: boolean;
  minNights: number;
  maxNights: number;
  cancellationPolicy: string;

  blockedRanges: PropertyBlockedRange[];

  createdAt: string;
  updatedAt: string;
}
