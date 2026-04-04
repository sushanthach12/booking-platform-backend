import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
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

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────

export class HostOnboardingBasicInfoDto {
  @ApiProperty({
    type: String,
    description: 'Type of property',
    enum: EPropertyType,
    example: EPropertyType.APARTMENT,
  })
  @IsEnum(EPropertyType)
  @IsNotEmpty()
  propertyType: EPropertyType;

  @ApiProperty({
    type: String,
    description: 'Title of the property',
    example: 'Cozy beachside apartment',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    type: String,
    description: 'Description of the property',
    example: 'A beautiful apartment with ocean views...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(8000)
  description: string;
}

// ─── Step 2: Location ─────────────────────────────────────────────────────────

export class HostOnboardingLocationDto {
  @ApiProperty({
    type: String,
    description: 'First line of the property address',
    example: '123 Ocean Drive',
  })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Second line of the property address',
    example: 'Apt 4B',
  })
  @IsString()
  @IsOptional()
  addressLine2: string;

  @ApiProperty({
    type: String,
    description: 'City of the property',
    example: 'Miami',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    type: String,
    description: 'State of the property',
    example: 'Florida',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    type: String,
    description: 'Country of the property',
    example: 'US',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    type: String,
    description: 'Postal code of the property',
    example: '33101',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({
    type: Number,
    description: 'Latitude of the property',
    example: 25.7617,
    required: true,
  })
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty({
    type: Number,
    description: 'Longitude of the property',
    example: -80.1918,
    required: true,
  })
  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  longitude: number;
}

// ─── Step 3: Pricing & Policies ───────────────────────────────────────────────

class PricingChargeFeeDto {
  @ApiProperty({
    type: String,
    description: 'Type of charge fee',
    enum: EPropertyChargeFeeTypes,
    example: EPropertyChargeFeeTypes.PERCENTAGE,
  })
  @IsEnum(EPropertyChargeFeeTypes)
  @IsNotEmpty()
  type: EPropertyChargeFeeTypes;

  @ApiProperty({
    type: Number,
    description: 'Value of the charge fee',
    example: 10,
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  value: number;
}

class PricingChargeDto {
  @ApiProperty({
    type: String,
    description: 'Type of charge',
    enum: EPropertyChargeTypes,
    example: EPropertyChargeTypes.CLEANING_FEE,
  })
  @IsEnum(EPropertyChargeTypes)
  @IsNotEmpty()
  type: EPropertyChargeTypes;

  @ApiPropertyOptional({
    type: PricingChargeFeeDto,
    description: 'Charge fee for the charge',
    example: {
      type: EPropertyChargeFeeTypes.PERCENTAGE,
      value: 10,
    },
  })
  @ValidateNested()
  @Type(() => PricingChargeFeeDto)
  @IsOptional()
  chargeFee: PricingChargeFeeDto;
}

export class HostOnboardingPricingPoliciesDto {
  @ApiProperty({
    type: Number,
    description: 'Base price per night',
    example: 120,
    required: true,
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  basePrice: number;

  @ApiProperty({
    type: String,
    description: 'ISO 4217 currency code',
    example: 'INR',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'currency must be a 3-letter ISO 4217 code',
  })
  currency: string;

  @ApiPropertyOptional({
    type: [PricingChargeDto],
    description: 'Charges for the pricing',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingChargeDto)
  @IsOptional()
  charges: PricingChargeDto[];

  @ApiProperty({
    type: Number,
    description: 'Minimum number of nights',
    example: 1,
    required: true,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minNights: number;

  @ApiProperty({
    type: Number,
    description: 'Maximum number of nights',
    example: 30,
    required: true,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  maxNights: number;

  @ApiProperty({
    type: Number,
    description: 'Maximum number of guests',
    example: 4,
    required: true,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  maxGuests: number;

  @ApiProperty({
    type: String,
    description: 'Check in time (24h HH:mm)',
    example: '14:00',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'checkInTime must be HH:mm in 24-hour format',
  })
  checkInTime: string;

  @ApiProperty({
    type: String,
    description: 'Check out time (24h HH:mm)',
    example: '11:00',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'checkOutTime must be HH:mm in 24-hour format',
  })
  checkOutTime: string;

  @ApiProperty({
    type: String,
    description: 'Cancellation policy',
    enum: EPropertyCancellationPolicy,
    example: EPropertyCancellationPolicy.FLEXIBLE,
    required: true,
  })
  @IsEnum(EPropertyCancellationPolicy)
  @IsNotEmpty()
  cancellationPolicy: EPropertyCancellationPolicy;

  @ApiProperty({
    type: Boolean,
    description: 'Enable waitlist',
    example: false,
    required: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  enableWaitlist: boolean;
}

// ─── Step 4: Amenities & Rules ────────────────────────────────────────────────

export class HostOnboardingAmenityDto {
  @ApiProperty({
    type: String,
    description: 'Name of the amenity',
    example: 'Wi-Fi',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Description of the amenity',
    example: 'High-speed fibre connection',
  })
  @IsString()
  @IsOptional()
  description: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Icon of the amenity',
    example: 'wifi',
  })
  @IsString()
  @IsOptional()
  icon: string;

  @ApiProperty({
    type: String,
    description: 'Category of the amenity',
    enum: EPropertyAmenityCategory,
    example: EPropertyAmenityCategory.GENERAL,
    required: true,
  })
  @IsEnum(EPropertyAmenityCategory)
  @IsNotEmpty()
  category: EPropertyAmenityCategory;
}

export class HostOnboardingRuleDto {
  @ApiProperty({
    type: String,
    description: 'Type of the rule',
    enum: EPropertyRuleType,
    example: EPropertyRuleType.NO_SMOKING,
    required: true,
  })
  @IsEnum(EPropertyRuleType)
  @IsNotEmpty()
  ruleType: EPropertyRuleType;

  @ApiProperty({
    type: Boolean,
    description: 'Allowed status of the rule',
    example: false,
    required: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  allowed: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Description of the rule',
    example: 'No smoking anywhere on the property',
  })
  @IsString()
  @IsOptional()
  description: string;
}

export class HostOnboardingAmenitiesRulesDto {
  @ApiProperty({
    type: [HostOnboardingAmenityDto],
    description: 'Amenities for the property',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => HostOnboardingAmenityDto)
  @IsNotEmpty()
  amenities: HostOnboardingAmenityDto[];

  @ApiPropertyOptional({
    type: [HostOnboardingRuleDto],
    description: 'Rules for the property',
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => HostOnboardingRuleDto)
  @IsOptional()
  rules: HostOnboardingRuleDto[];
}

// ─── Step 5: Media ────────────────────────────────────────────────────────────

export class HostOnboardingMediaDto {
  @ApiProperty({
    type: [String],
    description:
      'Public URLs of uploaded property photos (from /upload/presign)',
    example: ['https://cdn.example.com/photos/abc.jpg'],
    required: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one property image URL is required' })
  @ArrayMaxSize(50)
  @IsUrl({}, { each: true })
  @IsNotEmpty()
  imageUrls: string[];
}

// ─── Composite Onboarding DTO ─────────────────────────────────────────────────

export class HostOnboardingDto {
  @ApiProperty({
    type: HostOnboardingBasicInfoDto,
    description: 'Basic information about the property',
    required: true,
  })
  @ValidateNested()
  @Type(() => HostOnboardingBasicInfoDto)
  @IsNotEmpty()
  basicInfo: HostOnboardingBasicInfoDto;

  @ApiProperty({
    type: HostOnboardingLocationDto,
    description: 'Location of the property',
    required: true,
  })
  @ValidateNested()
  @Type(() => HostOnboardingLocationDto)
  @IsNotEmpty()
  location: HostOnboardingLocationDto;

  @ApiProperty({
    type: HostOnboardingPricingPoliciesDto,
    description: 'Pricing and policies for the property',
    required: true,
  })
  @ValidateNested()
  @Type(() => HostOnboardingPricingPoliciesDto)
  @IsNotEmpty()
  pricingAndPolicies: HostOnboardingPricingPoliciesDto;

  @ApiProperty({
    type: HostOnboardingAmenitiesRulesDto,
    description: 'Amenities and rules for the property',
    required: true,
  })
  @ValidateNested()
  @Type(() => HostOnboardingAmenitiesRulesDto)
  @IsNotEmpty()
  amenitiesAndRules: HostOnboardingAmenitiesRulesDto;

  @ApiProperty({
    type: HostOnboardingMediaDto,
    description: 'Media for the property',
    required: true,
  })
  @ValidateNested()
  @Type(() => HostOnboardingMediaDto)
  @IsNotEmpty()
  media: HostOnboardingMediaDto;
}
