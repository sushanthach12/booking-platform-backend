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
