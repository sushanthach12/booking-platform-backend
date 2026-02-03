import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import {
  CreatePropertyAvailabilityDto,
  CreatePropertyAvailabilityQueryDto,
} from '../dto/availability.dto';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { PropertyListingDto } from '../dto/listing.dto';
import { PropertyService } from '../services/property.service';

@Controller('properties')
export class PropertyController {
  private readonly logger = new Logger(PropertyController.name);

  constructor(private readonly propertyService: PropertyService) {}

  private handleError(res: Response, error: any) {
    const errorMessage =
      error instanceof Error ? error.message : 'Something went wrong';
    const statusCode =
      error.response?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).json({ message: errorMessage });
  }

  @Post('listing')
  @HttpCode(HttpStatus.OK)
  async getProperties(@Res() res: Response, @Body() body: PropertyListingDto) {
    try {
      this.logger.log(`Get properties request received`);

      const response = await this.propertyService.getProperties({
        payload: body,
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error getting properties:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async createProperty(
    @Res() res: Response,
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePropertyDto,
  ) {
    try {
      this.logger.log(`Create property request received`);

      const response = await this.propertyService.createProperty({
        payload: body,
        user,
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error creating property:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Post('availability')
  @HttpCode(HttpStatus.OK)
  async createPropertyAvailability(
    @Res() res: Response,
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePropertyAvailabilityDto,
    @Query() query: CreatePropertyAvailabilityQueryDto,
  ) {
    try {
      this.logger.log(`Create property request received`);

      const response = await this.propertyService.createPropertyAvailability({
        user,
        query,
        payload: body,
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error creating property:`, error.message);
      return this.handleError(res, error);
    }
  }
}
