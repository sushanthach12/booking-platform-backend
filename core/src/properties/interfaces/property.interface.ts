import { IPaginationResponse } from '../../common/interfaces/pagination.interface';
import { RequestUser } from '../../common/types/users.types';
import {
  EPropertyAmenityCategory,
  EPropertyCancellationPolicy,
  EPropertyChargeFeeTypes,
  EPropertyChargeTypes,
  EPropertyRuleType,
  EPropertyStatus,
  EPropertyType,
} from '../enums/property.enum';

export interface ICreatePropertyRequestParams {
  user: RequestUser;
  payload: {
    details: {
      title: string;
      description: string;
      propertyType: EPropertyType;
    };
    address: {
      addressLine1: string;
      addressLine2: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
      latitude: number;
      longitude: number;
    };
    pricing: {
      basePrice: number;
      currency: string;
      charges: {
        type: EPropertyChargeTypes;
        chargeFee: {
          type: EPropertyChargeFeeTypes;
          value: number;
        };
      }[];
    };
    policies: {
      minNights: number;
      maxNights: number;
      maxGuests: number;
      checkInTime: string;
      checkOutTime: string;
      enableWaitlist: boolean;
      cancellationPolicy: EPropertyCancellationPolicy;
    };
    rules: {
      ruleType: EPropertyRuleType;
      allowed: boolean;
      description: string;
    }[];
    amenities: {
      name: string;
      description: string;
      icon: string;
      category: EPropertyAmenityCategory;
    }[];
  };
}

export interface ICreatePropertyResponse {
  id: string;
  title: string;
  description: string | null;
  propertyType: EPropertyType;
  status: EPropertyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetPropertiesRequestParams {
  payload: {
    page: number;
    limit: number;
  };
}

export interface IGetPropertiesResult {
  id: string;
  title: string;
  description: string | null;
  propertyType: EPropertyType;
  status: EPropertyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetPropertiesResponse {
  results: IGetPropertiesResult[];
  pagination: IPaginationResponse;
}

export interface ICreatePropertyAvailabilityRequestParams {
  user: RequestUser;
  query: {
    propertyId: string;
  };
  payload: {
    roomId: string;
    startDate: string;
    endDate: string;
    available: boolean;
    price: number;
    minNights: number;
    maxNights: number;
    note: string;
    blockReason: string;
  };
}

export interface ICreatePropertyAvailabilityResponse {
  id: string;
  propertyId: string;
  roomId: string;
}

// Property CRUD Operations
export interface IGetPropertyRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
    includeRelations?: boolean;
  };
}

export interface IGetPropertyResponse {
  id: string;
  hostId: string;
  title: string;
  description: string | null;
  propertyType: EPropertyType;
  status: EPropertyStatus;
  createdAt: Date;
  updatedAt: Date;
  location?: PropertyLocationResponse;
  pricing?: PropertyPricingResponse;
  details?: PropertyDetailsResponse;
  policies?: PropertyPolicyResponse;
  images?: PropertyImageResponse[];
  amenities?: PropertyAmenityResponse[];
  rooms?: RoomResponse[];
  ratings?: PropertyRatingResponse;
}

export interface IUpdatePropertyRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
  };
  payload: Partial<{
    title: string;
    description: string;
    propertyType: EPropertyType;
    status: EPropertyStatus;
  }>;
}

export interface IUpdatePropertyResponse {
  id: string;
  title: string;
  description: string | null;
  propertyType: EPropertyType;
  status: EPropertyStatus;
  updatedAt: Date;
}

export interface IDeletePropertyRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
  };
}

export interface IDeletePropertyResponse {
  id: string;
  status: EPropertyStatus;
  deletedAt: Date;
}

export interface IUpdatePropertyStatusRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
  };
  payload: {
    status: EPropertyStatus;
  };
}

export interface IUpdatePropertyStatusResponse {
  id: string;
  status: EPropertyStatus;
  updatedAt: Date;
}

// Property Images
export interface ICreatePropertyImageRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
  };
  payload: {
    url: string;
    thumbnailUrl?: string;
    caption?: string;
    altText?: string;
    displayOrder?: number;
    isPrimary?: boolean;
    width?: number;
    height?: number;
    fileSize?: number;
    mimeType?: string;
  };
}

export interface IUpdatePropertyImageRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
    imageId: string;
  };
  payload: Partial<{
    caption: string;
    altText: string;
    displayOrder: number;
    isPrimary: boolean;
  }>;
}

export interface IDeletePropertyImageRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
    imageId: string;
  };
}

export interface IReorderPropertyImagesRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
  };
  payload: {
    imageOrders: {
      imageId: string;
      displayOrder: number;
    }[];
  };
}

// Property Amenities
export interface IAddPropertyAmenitiesRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
  };
  payload: {
    amenityIds: string[];
  };
}

export interface IRemovePropertyAmenityRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
    amenityId: string;
  };
}

export interface IGetAmenitiesResponse {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  description: string | null;
}[];

// Room Management
export interface ICreateRoomRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
  };
  payload: {
    name: string;
    description?: string;
    roomType: string;
    beds: number;
    bedType?: string;
    maxGuests: number;
    basePrice?: number;
    isPrivate?: boolean;
    hasBathroom?: boolean;
    hasBalcony?: boolean;
    floorNumber?: number;
    squareMeters?: number;
  };
}

export interface IUpdateRoomRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
    roomId: string;
  };
  payload: Partial<{
    name: string;
    description: string;
    roomType: string;
    beds: number;
    bedType: string;
    maxGuests: number;
    basePrice: number;
    isPrivate: boolean;
    hasBathroom: boolean;
    hasBalcony: boolean;
    floorNumber: number;
    squareMeters: number;
    status: string;
  }>;
}

export interface IDeleteRoomRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
    roomId: string;
  };
}

// Enhanced Availability Management
export interface IGetPropertyAvailabilityRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
    roomId?: string;
    startDate: string;
    endDate: string;
  };
}

export interface IUpdatePropertyAvailabilityRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
  };
  payload: {
    roomId?: string;
    startDate: string;
    endDate: string;
    available: boolean;
    price?: number;
    minNights?: number;
    maxNights?: number;
    note?: string;
    blockReason?: string;
  };
}

export interface IBulkUpdateAvailabilityRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
  };
  payload: {
    updates: {
      roomId?: string;
      date: string;
      available: boolean;
      price?: number;
      minNights?: number;
      maxNights?: number;
      note?: string;
      blockReason?: string;
    }[];
  };
}

export interface ICheckAvailabilityRequestParams {
  params: {
    propertyId: string;
    roomId?: string;
    startDate: string;
    endDate: string;
    guests?: number;
  };
}

export interface ICheckAvailabilityResponse {
  available: boolean;
  availableDates: {
    date: string;
    available: boolean;
    price?: number;
    minNights?: number;
    maxNights?: number;
  }[];
  totalPrice?: number;
  message?: string;
}

// Pricing Management
export interface IGetPropertyPricingRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
  };
}

export interface IUpdatePropertyPricingRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
  };
  payload: {
    basePrice: number;
    currency?: string;
    cleaningFee?: number;
    serviceFeePercentage?: number;
  };
}

export interface ICalculatePriceRequestParams {
  params: {
    propertyId: string;
    roomId?: string;
    startDate: string;
    endDate: string;
    guests?: number;
  };
}

export interface ICalculatePriceResponse {
  basePrice: number;
  cleaningFee: number;
  serviceFee: number;
  totalPrice: number;
  currency: string;
  nightlyRates: {
    date: string;
    price: number;
  }[];
}

// Search and Discovery
export interface ISearchPropertiesRequestParams {
  payload: {
    query?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    radius?: number; // in kilometers
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    propertyType?: string[];
    minPrice?: number;
    maxPrice?: number;
    amenities?: string[];
    page?: number;
    limit?: number;
    sortBy?: 'price' | 'rating' | 'distance' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  };
}

export interface INearbyPropertiesRequestParams {
  params: {
    latitude: number;
    longitude: number;
    radius?: number; // in kilometers
    limit?: number;
  };
}

// Host-specific endpoints
export interface IGetHostPropertiesRequestParams {
  user: RequestUser;
  payload: {
    page?: number;
    limit?: number;
    status?: EPropertyStatus;
    propertyType?: EPropertyType;
  };
}

export interface IGetPropertyAnalyticsRequestParams {
  user: RequestUser;
  params: {
    propertyId: string;
    startDate?: string;
    endDate?: string;
  };
}

export interface IGetPropertyAnalyticsResponse {
  totalViews: number;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  occupancyRate: number;
  bookingTrends: {
    date: string;
    bookings: number;
    revenue: number;
  }[];
}

// Response Types
export interface PropertyLocationResponse {
  id: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface PropertyPricingResponse {
  id: string;
  basePrice: number;
  currency: string;
  cleaningFee: number;
  serviceFeePercentage: number;
}

export interface PropertyDetailsResponse {
  id: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
}

export interface PropertyPolicyResponse {
  id: string;
  minNights: number;
  maxNights: number;
  maxGuests: number;
  checkInTime: string;
  checkOutTime: string;
  enableWaitlist: boolean;
  cancellationPolicy: string;
}

export interface PropertyImageResponse {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  createdAt: Date;
}

export interface PropertyAmenityResponse {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category: string;
}

export interface RoomResponse {
  id: string;
  name: string;
  description?: string;
  roomType: string;
  beds: number;
  bedType?: string;
  maxGuests: number;
  basePrice?: number;
  isPrivate: boolean;
  hasBathroom: boolean;
  hasBalcony: boolean;
  floorNumber?: number;
  squareMeters?: number;
  status: string;
  images?: PropertyImageResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyRatingResponse {
  id: string;
  averageRating: number;
  totalReviews: number;
  cleanlinessRating?: number;
  communicationRating?: number;
  checkInRating?: number;
  accuracyRating?: number;
  locationRating?: number;
  valueRating?: number;
}
