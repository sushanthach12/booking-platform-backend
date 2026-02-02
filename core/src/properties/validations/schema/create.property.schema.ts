import { z } from 'zod';
import { EUserRole } from '../../../users/enums/user.enum';
import {
  EPropertyAmenityCategory,
  EPropertyCancellationPolicy,
  EPropertyChargeFeeTypes,
  EPropertyChargeTypes,
  EPropertyRuleType,
  EPropertyType,
} from '../../enums/property.enum';

export const EPropertyTypeSchema = z.enum(EPropertyType);
export const EPropertyChargeTypesSchema = z.enum(EPropertyChargeTypes);
export const EPropertyChargeFeeTypesSchema = z.enum(EPropertyChargeFeeTypes);
export const EPropertyCancellationPolicySchema = z.enum(
  EPropertyCancellationPolicy,
);
export const EPropertyRuleTypeSchema = z.enum(EPropertyRuleType);
export const EPropertyAmenityCategorySchema = z.enum(EPropertyAmenityCategory);

export const RequestUserSchema = z.object({
  id: z.string(),
  role: z.enum(EUserRole),
});

const PropertyDetailsSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  propertyType: EPropertyTypeSchema,
});

const PropertyAddressSchema = z.object({
  addressLine1: z.string().min(3),
  addressLine2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postalCode: z.string(),
});

const PropertyChargeFeeSchema = z.object({
  type: EPropertyChargeFeeTypesSchema,
  value: z.number().positive(),
});

const PropertyChargeSchema = z.object({
  type: EPropertyChargeTypesSchema,
  chargeFee: PropertyChargeFeeSchema,
});

const PropertyPricingSchema = z.object({
  basePrice: z.number().positive(),
  currency: z.string().length(3),
  charges: z
    .array(PropertyChargeSchema)
    .default([])
    .refine(
      (charges) => {
        const chargeTypes = charges.map((charge) => charge.type);
        return chargeTypes.length === new Set(chargeTypes).size;
      },
      {
        message: 'Duplicate charges are not allowed',
      },
    ),
});

const PropertyPoliciesSchema = z.object({
  minNights: z.number().int().positive().min(1),
  maxNights: z.number().int().positive().min(1).max(365),
  maxGuests: z.number().int().positive().min(1),
  checkInTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  checkOutTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  enableWaitlist: z.boolean(),
  cancellationPolicy: EPropertyCancellationPolicySchema,
});

const PropertyRuleSchema = z.object({
  ruleType: EPropertyRuleTypeSchema,
  allowed: z.boolean(),
  description: z.string().optional(),
});

const PropertyAmenitySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  icon: z.string(),
  category: EPropertyAmenityCategorySchema,
});

export const CreatePropertyRequestSchema = z.object({
  user: RequestUserSchema,
  payload: z.object({
    details: PropertyDetailsSchema,
    address: PropertyAddressSchema,
    pricing: PropertyPricingSchema,
    policies: PropertyPoliciesSchema,
    rules: z.array(PropertyRuleSchema),
    amenities: z.array(PropertyAmenitySchema),
  }),
});
