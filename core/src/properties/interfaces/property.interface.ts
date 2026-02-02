import { RequestUser } from '../../common/types/users.types';
import {
  EPropertyAmenityCategory,
  EPropertyCancellationPolicy,
  EPropertyChargeFeeTypes,
  EPropertyChargeTypes,
  EPropertyRuleType,
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
