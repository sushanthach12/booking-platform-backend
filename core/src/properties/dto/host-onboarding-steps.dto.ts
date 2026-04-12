import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
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

// ─── Step 1: Create Draft ─────────────────────────────────────────────────────
// Reuses existing BasicInfo DTO (propertyType, title, description)
export class OnboardingStep1Dto extends HostOnboardingBasicInfoDto {}

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
