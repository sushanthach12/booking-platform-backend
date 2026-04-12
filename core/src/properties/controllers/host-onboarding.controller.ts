import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import {
  OnboardingPublishDto,
  OnboardingStep1Dto,
  OnboardingStep2Dto,
  OnboardingStep3Dto,
  OnboardingStep4Dto,
  OnboardingStep5Dto,
} from '../dto/host-onboarding-steps.dto';
import { PropertyService } from '../services/property.service';

/**
 * Handles the become-a-host onboarding flow.
 *
 * Two modes:
 *  1. Legacy (single-shot): POST /host/onboard — creates everything at once.
 *  2. Step-based (draft):
 *     - POST  /host/onboard/draft         → create draft, receive propertyId
 *     - PUT   /host/onboard/location      → save location (body includes propertyId)
 *     - PUT   /host/onboard/pricing       → save pricing/policies (body includes propertyId)
 *     - PUT   /host/onboard/amenities     → save amenities/rules (body includes propertyId)
 *     - PUT   /host/onboard/photos        → save photos (body includes propertyId)
 *     - POST  /host/onboard/publish       → completeness gate + DRAFT → ACTIVE
 *     - GET   /host/onboard/draft/resume  → returns current draft progress for resume
 *     - GET   /host/onboard/draft?propertyId=... → returns full draft state for pre-fill
 */
@ApiTags('Host Onboarding')
@Controller('host')
export class HostOnboardingController {
  private readonly logger = new Logger(HostOnboardingController.name);

  constructor(private readonly propertyService: PropertyService) {}

  // ─── Legacy Single-Shot Endpoint (kept intact) ────────────────────────────

  // @Post('onboard')
  // @HttpCode(HttpStatus.CREATED)
  // @ApiOperation({
  //   summary: 'Complete host onboarding and publish a property listing',
  // })
  // async onboard(
  //   @CurrentUser() user: RequestUser,
  //   @Body() body: HostOnboardingDto,
  // ) {
  //   this.logger.log(`Host onboarding request received for user id=${user.id}`);

  //   const rules = body.amenitiesAndRules.rules ?? [];

  //   const property = await this.propertyService.createProperty({
  //     user,
  //     payload: {
  //       details: body.basicInfo,
  //       address: body.location,
  //       pricing: body.pricingAndPolicies,
  //       policies: body.pricingAndPolicies,
  //       rules,
  //       amenities: body.amenitiesAndRules.amenities,
  //       imageUrls: body.media.imageUrls,
  //     },
  //   });

  //   return { data: property };
  // }

  // ─── Step-Based Draft Endpoints ───────────────────────────────────────────

  @Post('onboard/draft')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Step 1 — Create a DRAFT property listing and receive propertyId',
  })
  async createDraft(
    @CurrentUser() user: RequestUser,
    @Body() body: OnboardingStep1Dto,
  ) {
    this.logger.log(`Creating draft property for user id=${user.id}`);
    const result = await this.propertyService.createDraftProperty({
      user,
      payload: {
        title: body.title,
        description: body.description,
        propertyType: body.propertyType,
        propertyId: body.propertyId,
      },
    });
    return { data: result };
  }

  @Put('onboard/location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 2 — Save location for a DRAFT property (propertyId in body)',
  })
  async saveLocation(
    @CurrentUser() user: RequestUser,
    @Body() body: OnboardingStep2Dto,
  ) {
    this.logger.log(
      `Saving location for draft propertyId=${body.propertyId} user=${user.id}`,
    );
    await this.propertyService.saveDraftLocation({ user, payload: body });
    return { data: { propertyId: body.propertyId } };
  }

  @Put('onboard/pricing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Step 3 — Save pricing & policies for a DRAFT property (propertyId in body)',
  })
  async savePricing(
    @CurrentUser() user: RequestUser,
    @Body() body: OnboardingStep3Dto,
  ) {
    this.logger.log(
      `Saving pricing for draft propertyId=${body.propertyId} user=${user.id}`,
    );
    await this.propertyService.saveDraftPricing({ user, payload: body });
    return { data: { propertyId: body.propertyId } };
  }

  @Put('onboard/amenities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Step 4 — Save amenities & rules for a DRAFT property (propertyId in body)',
  })
  async saveAmenities(
    @CurrentUser() user: RequestUser,
    @Body() body: OnboardingStep4Dto,
  ) {
    this.logger.log(
      `Saving amenities for draft propertyId=${body.propertyId} user=${user.id}`,
    );
    await this.propertyService.saveDraftAmenities({ user, payload: body });
    return { data: { propertyId: body.propertyId } };
  }

  @Put('onboard/photos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 5 — Save photos for a DRAFT property (propertyId in body)',
  })
  async savePhotos(
    @CurrentUser() user: RequestUser,
    @Body() body: OnboardingStep5Dto,
  ) {
    this.logger.log(
      `Saving photos for draft propertyId=${body.propertyId} user=${user.id}`,
    );
    await this.propertyService.saveDraftPhotos({ user, payload: body });
    return { data: { propertyId: body.propertyId } };
  }

  @Post('onboard/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Publish a DRAFT property — runs completeness gate then transitions to ACTIVE',
  })
  async publishDraft(
    @CurrentUser() user: RequestUser,
    @Body() body: OnboardingPublishDto,
  ) {
    this.logger.log(
      `Publishing draft propertyId=${body.propertyId} user=${user.id}`,
    );
    const result = await this.propertyService.publishDraftProperty({
      user,
      payload: { propertyId: body.propertyId },
    });
    return { data: result };
  }

  @Get('onboard/draft/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Return the authenticated host's most recent DRAFT and completed steps for wizard resume",
  })
  async resumeDraft(@CurrentUser() user: RequestUser) {
    const result = await this.propertyService.getDraftForResume({ user });
    return { data: result };
  }

  @Get('onboard/draft')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Return full draft property details (with relations) for pre-filling the wizard on resume',
  })
  async getDraftDetails(
    @CurrentUser() user: RequestUser,
    @Query('propertyId') propertyId: string,
  ) {
    const result = await this.propertyService.getDraftDetails({
      user,
      propertyId,
    });
    return { data: result };
  }
}
