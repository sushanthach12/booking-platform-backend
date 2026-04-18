import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import {
  AddPropertyAmenitiesDto,
  RemovePropertyAmenityParamsDto,
} from '../dto/property-crud.dto';
import { PropertyAmenityService } from '../services/property-amenity.service';

@Controller({ path: 'properties/:propertyId/amenities', version: '1' })
export class PropertyAmenityController {
  private readonly logger = new Logger(PropertyAmenityController.name);

  constructor(
    private readonly propertyAmenityService: PropertyAmenityService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getPropertyAmenities(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.logger.log(
      `Get property amenities request received for property: ${propertyId}`,
    );

    const response = await this.propertyAmenityService.getPropertyAmenities({
      user,
      params: { propertyId },
    });

    return { data: response };
  }

  @Get('all')
  @HttpCode(HttpStatus.OK)
  async getAllAmenities() {
    this.logger.log(`Get all amenities request received`);

    const response = await this.propertyAmenityService.getAllAmenities();

    return { data: response };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addPropertyAmenities(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: AddPropertyAmenitiesDto,
  ) {
    this.logger.log(
      `Add property amenities request received for property: ${propertyId}`,
    );

    const response = await this.propertyAmenityService.addPropertyAmenities({
      user,
      params: { propertyId },
      payload: body,
    });

    return { data: response };
  }

  @Delete(':amenityId')
  @HttpCode(HttpStatus.OK)
  async removePropertyAmenity(
    @Param() params: RemovePropertyAmenityParamsDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.logger.log(
      `Remove property amenity request received for property: ${params.propertyId}`,
    );

    await this.propertyAmenityService.removePropertyAmenity({
      user,
      params: { propertyId: params.propertyId, amenityId: params.amenityId },
    });

    return { data: { message: 'Property amenity removed successfully' } };
  }
}
