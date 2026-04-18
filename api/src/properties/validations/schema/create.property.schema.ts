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
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  postalCode: z.string().min(1),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
});

const PropertyChargeFeeSchema = z.object({
  type: EPropertyChargeFeeTypesSchema,
  value: z.number().positive(),
});

const PropertyChargeSchema = z.object({
  type: EPropertyChargeTypesSchema,
  chargeFee: PropertyChargeFeeSchema.optional(),
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
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  icon: z.string().max(100).optional(),
  category: EPropertyAmenityCategorySchema,
});

/** Host onboarding requires ≥1 URL via HostOnboardingMediaDto; generic create may omit and default to []. */
const ImageUrlsSchema = z.array(z.string().url()).max(50).default([]);

export const CreatePropertyRequestSchema = z.object({
  user: RequestUserSchema,
  payload: z.object({
    details: PropertyDetailsSchema,
    address: PropertyAddressSchema,
    pricing: PropertyPricingSchema,
    policies: PropertyPoliciesSchema,
    rules: z.array(PropertyRuleSchema).default([]),
    amenities: z.array(PropertyAmenitySchema),
    imageUrls: ImageUrlsSchema,
  }),
});
