import { EPropertyType } from '../../properties/enums/property.enum';

/** Compact property card used across the homepage (featured / nearby rails). */
export interface IHomePropertySummary {
  id: string;
  title: string;
  slug: string;
  propertyType: EPropertyType;
  coverImage: string | null;
  location?: {
    city: string;
    state?: string;
    country: string;
  };
  pricing?: {
    basePrice: number;
    currency: string;
  } | null;
  ratings?: {
    averageRating: number;
    totalReviews: number;
  } | null;
}

/** A city/destination aggregate derived from active listings. */
export interface IHomeDestination {
  city: string;
  state?: string;
  country?: string;
  /** Number of active listings in this city. */
  propertyCount: number;
  /** Cheapest base price across the city's listings (null if none priced). */
  fromPrice: number | null;
  currency: string | null;
  coverImage: string | null;
}

export interface IGetHomeRequestParams {
  params: {
    /** Optional free-text location to bias the "nearby" rail. */
    location?: string;
    /** Items per rail (featured / nearby). Defaults to 8. */
    limit?: number;
  };
}

export interface IGetHomeResponse {
  featured: IHomePropertySummary[];
  nearby: IHomePropertySummary[];
  destinations: IHomeDestination[];
}
