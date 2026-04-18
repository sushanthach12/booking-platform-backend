import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import {
  EPropertyAmenityCategory,
  EPropertyCancellationPolicy,
  EPropertyChargeFeeTypes,
  EPropertyChargeTypes,
  EPropertyRuleType,
  EPropertyType,
} from '../enums/property.enum';

class ProperyDetailsDto {
  @ApiProperty({
    type: String,
    description: 'Property title',
    example: 'Property title',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    type: String,
    description: 'Property description',
    example: 'Property description',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    type: String,
    description: 'Property type',
    enum: EPropertyType,
    example: EPropertyType.APARTMENT,
  })
  @IsString()
  @IsEnum(EPropertyType)
  @IsNotEmpty()
  propertyType: EPropertyType;
}

class PropertyAddressDto {
  @ApiProperty({
    type: String,
    description: 'Property address',
    example: 'Property address',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiProperty({
    type: String,
    description: 'Property address line 2',
    example: 'Property address line 2',
    required: false,
  })
  @IsString()
  @IsOptional()
  addressLine2: string;

  @ApiProperty({
    type: String,
    description: 'Property city',
    example: 'Property city',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    type: String,
    description: 'Property state',
    example: 'Property state',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    type: String,
    description: 'Property country',
    example: 'Property country',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    type: String,
    description: 'Property postal code',
    example: 'Property postal code',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({
    type: Number,
    description: 'Property latitude',
    example: 'Property latitude',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({
    type: Number,
    description: 'Property longitude',
    example: 'Property longitude',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}

class PropertyChargeFeeDto {
  @ApiProperty({
    type: String,
    enum: EPropertyChargeFeeTypes,
    description: 'Property service type (percentage, fixed)',
    example: EPropertyChargeFeeTypes.PERCENTAGE,
    required: true,
  })
  @IsString()
  @IsEnum(EPropertyChargeFeeTypes)
  @IsNotEmpty()
  type: EPropertyChargeFeeTypes;

  @ApiProperty({
    type: Number,
    description: 'Property service fee value',
    example: 'Property service fee value',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  value: number;
}

class PropertyPricingChargesDto {
  @ApiProperty({
    type: String,
    enum: EPropertyChargeTypes,
    description: 'Property charge type (cleaning_fee, service_fee)',
    example: EPropertyChargeTypes.CLEANING_FEE,
    required: true,
  })
  @IsString()
  @IsEnum(EPropertyChargeTypes)
  @IsNotEmpty()
  type: EPropertyChargeTypes;

  @ApiProperty({
    type: PropertyChargeFeeDto,
    description: 'Property service fee',
  })
  @ValidateNested()
  @Type(() => PropertyChargeFeeDto)
  @IsOptional()
  chargeFee: PropertyChargeFeeDto;
}

class PropertyPricingDto {
  @ApiProperty({
    type: Number,
    description: 'Property base price',
    example: 'Property base price',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  basePrice: number;

  @ApiProperty({
    type: String,
    description: 'Property currency',
    example: 'Property currency',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiPropertyOptional({
    type: [PropertyPricingChargesDto],
    description: 'Property pricing charges',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyPricingChargesDto)
  @IsOptional()
  charges: PropertyPricingChargesDto[];
}

class PropertyPolicyDto {
  @ApiProperty({
    type: Number,
    description: 'Property minimum nights',
    example: 'Property minimum nights',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  minNights: number;

  @ApiProperty({
    type: Number,
    description: 'Property maximum nights',
    example: 'Property maximum nights',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  maxNights: number;

  @ApiProperty({
    type: Number,
    description: 'Property maximum guests',
    example: 'Property maximum guests',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  maxGuests: number;

  @ApiProperty({
    type: String,
    description: 'Property check in time',
    example: 'Property check in time',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  checkInTime: string;

  @ApiProperty({
    type: String,
    description: 'Property check out time',
    example: 'Property check out time',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  checkOutTime: string;

  @ApiProperty({
    type: Boolean,
    description: 'Enable waitlist',
    example: true,
    required: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  enableWaitlist: boolean;

  @ApiProperty({
    type: String,
    description: 'Property cancellation policy',
    enum: EPropertyCancellationPolicy,
    example: EPropertyCancellationPolicy.FLEXIBLE,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(EPropertyCancellationPolicy)
  cancellationPolicy: EPropertyCancellationPolicy;
}

export class PropertyRulesDto {
  @ApiProperty({
    type: String,
    description: 'Property rule type',
    enum: EPropertyRuleType,
    example: EPropertyRuleType.PETS,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(EPropertyRuleType)
  ruleType: EPropertyRuleType;

  @ApiProperty({
    type: Boolean,
    description: 'Property rule allowed',
    example: true,
    required: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  allowed: boolean;

  @ApiProperty({
    type: String,
    description: 'Property rule description',
    example: 'Property rule description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description: string;
}

class PropertyAmenitiesDto {
  @ApiProperty({
    type: String,
    description: 'Property amenity name',
    example: 'Property amenity name',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    type: String,
    description: 'Property amenity description',
    example: 'Property amenity description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty({
    type: String,
    description: 'Property amenity icon',
    example: 'Property amenity icon',
    required: false,
  })
  @IsString()
  @IsOptional()
  icon: string;

  @ApiProperty({
    type: String,
    description: 'Property amenity category',
    enum: EPropertyAmenityCategory,
    example: EPropertyAmenityCategory.ESSENTIALS,
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(EPropertyAmenityCategory)
  category: EPropertyAmenityCategory;
}

export class CreatePropertyDto {
  @ApiProperty({
    type: ProperyDetailsDto,
    description: 'Property details',
  })
  @ValidateNested()
  @Type(() => ProperyDetailsDto)
  @IsNotEmpty()
  details: ProperyDetailsDto;

  @ApiProperty({
    type: PropertyAddressDto,
    description: 'Property address',
  })
  @ValidateNested()
  @Type(() => PropertyAddressDto)
  @IsNotEmpty()
  address: PropertyAddressDto;

  @ApiProperty({
    type: PropertyPricingDto,
    description: 'Property pricing',
  })
  @ValidateNested()
  @Type(() => PropertyPricingDto)
  @IsNotEmpty()
  pricing: PropertyPricingDto;

  @ApiProperty({
    type: PropertyPolicyDto,
    description: 'Property policies',
  })
  @ValidateNested()
  @Type(() => PropertyPolicyDto)
  @IsNotEmpty()
  policies: PropertyPolicyDto;

  @ApiProperty({
    type: [PropertyRulesDto],
    description: 'Property rules',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyRulesDto)
  @IsNotEmpty()
  rules: PropertyRulesDto[];

  @ApiProperty({
    type: [PropertyAmenitiesDto],
    description: 'Property amenities',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyAmenitiesDto)
  @IsNotEmpty()
  amenities: PropertyAmenitiesDto[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Optional public image URLs to attach on create (same as host onboarding media)',
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}
