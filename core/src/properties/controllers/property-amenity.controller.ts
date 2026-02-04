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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import {
  AddPropertyAmenitiesDto,
  RemovePropertyAmenityParamsDto,
} from '../dto/property-crud.dto';
import { PropertyAmenityService } from '../services/property-amenity.service';

@Controller('properties/:propertyId/amenities')
export class PropertyAmenityController {
  private readonly logger = new Logger(PropertyAmenityController.name);

  constructor(private readonly propertyAmenityService: PropertyAmenityService) {}

  private handleError(res: Response, error: any) {
    const errorMessage =
      error instanceof Error ? error.message : 'Something went wrong';
    const statusCode =
      error.response?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).json({ message: errorMessage });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getPropertyAmenities(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Get property amenities request received for property: ${propertyId}`);

      const response = await this.propertyAmenityService.getPropertyAmenities({
        user,
        params: { propertyId },
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error getting property amenities:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Get('all')
  @HttpCode(HttpStatus.OK)
  async getAllAmenities(
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Get all amenities request received`);

      const response = await this.propertyAmenityService.getAllAmenities();

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error getting all amenities:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addPropertyAmenities(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: AddPropertyAmenitiesDto,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Add property amenities request received for property: ${propertyId}`);

      const response = await this.propertyAmenityService.addPropertyAmenities({
        user,
        params: { propertyId },
        payload: body,
      });

      return res.status(HttpStatus.CREATED).json({ data: response });
    } catch (error) {
      this.logger.error(`Error adding property amenities:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Delete(':amenityId')
  @HttpCode(HttpStatus.OK)
  async removePropertyAmenity(
    @Param() params: RemovePropertyAmenityParamsDto,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Remove property amenity request received for property: ${params.propertyId}`);

      await this.propertyAmenityService.removePropertyAmenity({
        user,
        params: { propertyId: params.propertyId, amenityId: params.amenityId },
      });

      return res.status(HttpStatus.OK).json({ message: 'Property amenity removed successfully' });
    } catch (error) {
      this.logger.error(`Error removing property amenity:`, error.message);
      return this.handleError(res, error);
    }
  }
}
