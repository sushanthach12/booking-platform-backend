import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import {
  HostOnboardingAmenitiesRulesDto,
  HostOnboardingBasicInfoDto,
  HostOnboardingLocationDto,
  HostOnboardingPricingPoliciesDto,
} from './host-onboarding.dto';
import { CreatePropertyImageDto } from './property-crud.dto';

// ─── Step 1: Create or Update Draft ──────────────────────────────────────────
// If propertyId is provided the service updates the existing draft instead of
// creating a new one. If the property is not in DRAFT status the service throws
// a 409 with code PROPERTY_NOT_IN_DRAFT_STATUS so the frontend can redirect.
export class OnboardingStep1Dto extends HostOnboardingBasicInfoDto {
  @ApiPropertyOptional({
    type: String,
    description:
      'Existing draft property ID — when provided the draft is updated instead of created',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  propertyId?: string;
}

// ─── Step 2: Location ─────────────────────────────────────────────────────────
export class OnboardingStep2Dto extends HostOnboardingLocationDto {
  @ApiProperty({
    type: String,
    description: 'Draft property ID returned from step 1',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;
}

// ─── Step 3: Pricing & Policies ───────────────────────────────────────────────
export class OnboardingStep3Dto extends HostOnboardingPricingPoliciesDto {
  @ApiProperty({
    type: String,
    description: 'Draft property ID returned from step 1',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;
}

// ─── Step 4: Amenities & Rules ────────────────────────────────────────────────
export class OnboardingStep4Dto extends HostOnboardingAmenitiesRulesDto {
  @ApiProperty({
    type: String,
    description: 'Draft property ID returned from step 1',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;
}

// ─── Step 5: Photos ───────────────────────────────────────────────────────────
export class OnboardingStep5Dto {
  @ApiProperty({
    type: String,
    description: 'Draft property ID returned from step 1',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({
    type: [CreatePropertyImageDto],
    description:
      'Array of image objects with metadata (url, altText, fileSize, mimeType, etc.)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one image is required' })
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreatePropertyImageDto)
  images: CreatePropertyImageDto[];
}

// ─── Publish ──────────────────────────────────────────────────────────────────
export class OnboardingPublishDto {
  @ApiProperty({
    type: String,
    description: 'Draft property ID to publish',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;
}
