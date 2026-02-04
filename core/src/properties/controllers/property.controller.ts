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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { PropertyListingDto } from '../dto/listing.dto';
import {
  GetHostPropertiesDto,
  GetPropertyAnalyticsParamsDto,
  GetPropertyParamsDto,
  NearbyPropertiesDto,
  SearchPropertiesDto,
  UpdatePropertyDto,
  UpdatePropertyStatusDto,
} from '../dto/property-crud.dto';
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

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getProperty(
    @Param() params: GetPropertyParamsDto,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(
        `Get property request received for property: ${params.propertyId}`,
      );

      const response = await this.propertyService.getProperty({
        user,
        params: {
          propertyId: params.propertyId,
          includeRelations: params.includeRelations,
        },
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error getting property:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateProperty(
    @Param('id') propertyId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdatePropertyDto,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(
        `Update property request received for property: ${propertyId}`,
      );

      const response = await this.propertyService.updateProperty({
        user,
        params: { propertyId },
        payload: body,
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error updating property:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteProperty(
    @Param('id') propertyId: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(
        `Delete property request received for property: ${propertyId}`,
      );

      await this.propertyService.deleteProperty({
        user,
        params: { propertyId },
      });

      return res
        .status(HttpStatus.OK)
        .json({ message: 'Property deleted successfully' });
    } catch (error) {
      this.logger.error(`Error deleting property:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updatePropertyStatus(
    @Param('id') propertyId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdatePropertyStatusDto,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(
        `Update property status request received for property: ${propertyId}`,
      );

      const response = await this.propertyService.updatePropertyStatus({
        user,
        params: { propertyId },
        payload: body,
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error updating property status:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async searchProperties(
    @Body() body: SearchPropertiesDto,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Search properties request received`);

      const response = await this.propertyService.searchProperties({
        payload: body,
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error searching properties:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Get('nearby')
  @HttpCode(HttpStatus.OK)
  async getNearbyProperties(
    @Query() query: NearbyPropertiesDto,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Get nearby properties request received`);

      const response = await this.propertyService.getNearbyProperties({
        params: query,
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error getting nearby properties:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Get('host/me')
  @HttpCode(HttpStatus.OK)
  async getHostProperties(
    @CurrentUser() user: RequestUser,
    @Query() query: GetHostPropertiesDto,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Get host properties request received`);

      const response = await this.propertyService.getHostProperties({
        user,
        payload: query,
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error getting host properties:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Get(':id/analytics')
  @HttpCode(HttpStatus.OK)
  async getPropertyAnalytics(
    @Param() params: GetPropertyAnalyticsParamsDto,
    @CurrentUser() user: RequestUser,
    @Query() query: { startDate?: string; endDate?: string },
    @Res() res: Response,
  ) {
    try {
      this.logger.log(
        `Get property analytics request received for property: ${params.propertyId}`,
      );

      const response = await this.propertyService.getPropertyAnalytics({
        user,
        params: {
          propertyId: params.propertyId,
          startDate: query.startDate,
          endDate: query.endDate,
        },
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error getting property analytics:`, error.message);
      return this.handleError(res, error);
    }
  }
}
