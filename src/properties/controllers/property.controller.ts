import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { PropertyListingDto } from '../dto/listing.dto';
import {
  BulkUpdateAvailabilityDto,
  GetHostPropertiesDto,
  GetPropertyAnalyticsQueryDto,
  GetPropertyAvailabilityQueryDto,
  GetPropertyDetailsQueryDto,
  NearbyPropertiesDto,
  PropertyQueryDto,
  SearchPropertiesDto,
  UpdatePropertyAvailabilityDto,
  UpdatePropertyDto,
  UpdatePropertyStatusDto,
} from '../dto/property-crud.dto';
import { PropertyService } from '../services/property.service';

@Controller({ path: 'properties', version: '1' })
export class PropertyController {
  private readonly logger = new Logger(PropertyController.name);

  constructor(private readonly propertyService: PropertyService) {}

  @Public()
  @Post('listing')
  @HttpCode(HttpStatus.OK)
  async getProperties(@Body() body: PropertyListingDto) {
    this.logger.log(`Get properties request received`);

    const response = await this.propertyService.getProperties({
      payload: body,
    });

    return { data: response };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async createProperty(
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePropertyDto,
  ) {
    this.logger.log(`Create property request received`);

    const response = await this.propertyService.createProperty({
      payload: body,
      user,
    });

    return { data: response };
  }

  @Public()
  @Get('details')
  @HttpCode(HttpStatus.OK)
  async getPropertyDetails(@Query() query: GetPropertyDetailsQueryDto) {
    this.logger.log(`Get property request received for property`);

    const response = await this.propertyService.getPropertyDetails({
      params: {
        propertyId: query.propertyId,
        includeRelations: query.includeRelations,
      },
    });

    return { data: response };
  }

  @Patch('details')
  @HttpCode(HttpStatus.OK)
  async updateProperty(
    @Query() query: PropertyQueryDto,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdatePropertyDto,
  ) {
    this.logger.log(`Update property request received for property`);

    const response = await this.propertyService.updateProperty({
      user,
      params: query,
      payload: body,
    });

    return { data: response };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteProperty(
    @Query() query: PropertyQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.logger.log(`Delete property request received for property`);

    await this.propertyService.deleteProperty({
      user,
      params: query,
    });

    return { data: { message: 'Property deleted successfully' } };
  }

  @Patch('status')
  @HttpCode(HttpStatus.OK)
  async updatePropertyStatus(
    @Query() query: PropertyQueryDto,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdatePropertyStatusDto,
  ) {
    this.logger.log(`Update property status request received for property`);

    const response = await this.propertyService.updatePropertyStatus({
      user,
      params: query,
      payload: body,
    });

    return { data: response };
  }

  @Public()
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async searchProperties(@Body() body: SearchPropertiesDto) {
    this.logger.log(`Search properties request received`);

    const response = await this.propertyService.searchProperties({
      payload: body,
    });

    return { data: response };
  }

  @Get('nearby')
  @HttpCode(HttpStatus.OK)
  async getNearbyProperties(@Query() query: NearbyPropertiesDto) {
    this.logger.log(`Get nearby properties request received`);

    const response = await this.propertyService.getNearbyProperties({
      params: query,
    });

    return { data: response };
  }

  /** GET /properties/search — alias for POST /properties/search with query params */
  @Public()
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchPropertiesGet(@Query() query: SearchPropertiesDto) {
    this.logger.log(`Search properties (GET) request received`);

    const response = await this.propertyService.searchProperties({
      payload: query,
    });

    return { data: response };
  }

  @Get('host/me')
  @HttpCode(HttpStatus.OK)
  async getHostProperties(
    @CurrentUser() user: RequestUser,
    @Query() query: GetHostPropertiesDto,
  ) {
    this.logger.log(`Get host properties request received`);

    const response = await this.propertyService.getHostProperties({
      user,
      payload: query,
    });

    return { data: response };
  }

  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  async getPropertyAnalytics(
    @Query() query: GetPropertyAnalyticsQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.logger.log(`Get property analytics request received for property`);

    const response = await this.propertyService.getPropertyAnalytics({
      user,
      params: query,
    });

    return { data: response };
  }

  @Get('availability')
  @HttpCode(HttpStatus.OK)
  async getPropertyAvailability(
    @CurrentUser() user: RequestUser,
    @Query() query: GetPropertyAvailabilityQueryDto,
  ) {
    this.logger.log(`Get property availability request for property`);

    const response = await this.propertyService.getPropertyAvailability({
      user,
      params: query,
    });

    return { data: response };
  }

  @Patch('availability/bulk')
  @HttpCode(HttpStatus.OK)
  async bulkUpdatePropertyAvailability(
    @CurrentUser() user: RequestUser,
    @Body() body: BulkUpdateAvailabilityDto,
    @Query() query: PropertyQueryDto,
  ) {
    this.logger.log(`Bulk update property availability request for property`);

    const response = await this.propertyService.bulkUpdateAvailability({
      user,
      params: query,
      payload: { updates: body.updates },
    });

    return { data: response };
  }

  @Patch('availability/range')
  @HttpCode(HttpStatus.OK)
  async updatePropertyAvailabilityRange(
    @Query() query: PropertyQueryDto,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdatePropertyAvailabilityDto,
  ) {
    this.logger.log(`Range update property availability request for property`);

    const response = await this.propertyService.updateAvailabilityRange({
      user,
      params: query,
      payload: {
        startDate: body.startDate,
        endDate: body.endDate,
        roomId: body.roomId,
        available: body.available,
        price: body.price,
        minNights: body.minNights,
        maxNights: body.maxNights,
        note: body.note,
        blockReason: body.blockReason,
      },
    });

    return { data: response };
  }

  /** GET /properties/:id — alias for GET /properties/details?propertyId=:id */
  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPropertyById(@Param('id') id: string) {
    this.logger.log(`Get property by id request received`);

    const response = await this.propertyService.getPropertyDetails({
      params: {
        propertyId: id,
        includeRelations: true,
      },
    });

    return { data: response };
  }
}
