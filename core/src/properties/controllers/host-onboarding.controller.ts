import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import { HostOnboardingDto } from '../dto/host-onboarding.dto';
import { PropertyService } from '../services/property.service';

/**
 * Handles the become-a-host onboarding flow.
 * Accepts the full 5-step form payload and creates the property listing
 * (with location, pricing, policies, amenities, rules, and photos) in one request.
 */
@ApiTags('Host Onboarding')
@Controller('host')
export class HostOnboardingController {
  private readonly logger = new Logger(HostOnboardingController.name);

  constructor(private readonly propertyService: PropertyService) {}

  @Post('onboard')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Complete host onboarding and publish a property listing',
  })
  async onboard(
    @CurrentUser() user: RequestUser,
    @Body() body: HostOnboardingDto,
  ) {
    this.logger.log(`Host onboarding request received for user id=${user.id}`);

    const rules = body.amenitiesAndRules.rules ?? [];

    const property = await this.propertyService.createProperty({
      user,
      payload: {
        details: body.basicInfo,
        address: body.location,
        pricing: body.pricingAndPolicies,
        policies: body.pricingAndPolicies,
        rules,
        amenities: body.amenitiesAndRules.amenities,
        imageUrls: body.media.imageUrls,
      },
    });

    return { data: property };
  }
}
