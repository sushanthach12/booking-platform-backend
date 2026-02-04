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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import {
  CreatePropertyImageDto,
  UpdatePropertyImageDto,
  UpdatePropertyImageParamsDto,
  DeletePropertyImageParamsDto,
  ReorderPropertyImagesDto,
} from '../dto/property-crud.dto';
import { PropertyImageService } from '../services/property-image.service';

@Controller('properties/:propertyId/images')
export class PropertyImageController {
  private readonly logger = new Logger(PropertyImageController.name);

  constructor(private readonly propertyImageService: PropertyImageService) {}

  private handleError(res: Response, error: any) {
    const errorMessage =
      error instanceof Error ? error.message : 'Something went wrong';
    const statusCode =
      error.response?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).json({ message: errorMessage });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPropertyImage(
    @Param() params: UpdatePropertyImageParamsDto,
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePropertyImageDto,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Create property image request received for property: ${params.propertyId}`);

      const response = await this.propertyImageService.createPropertyImage({
        user,
        params: { propertyId: params.propertyId },
        payload: body,
      });

      return res.status(HttpStatus.CREATED).json({ data: response });
    } catch (error) {
      this.logger.error(`Error creating property image:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getPropertyImages(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Get property images request received for property: ${propertyId}`);

      const response = await this.propertyImageService.getPropertyImages({
        user,
        params: { propertyId },
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error getting property images:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Patch(':imageId')
  @HttpCode(HttpStatus.OK)
  async updatePropertyImage(
    @Param() params: UpdatePropertyImageParamsDto,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdatePropertyImageDto,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Update property image request received for image: ${params.imageId}`);

      const response = await this.propertyImageService.updatePropertyImage({
        user,
        params: { propertyId: params.propertyId, imageId: params.imageId },
        payload: body,
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error updating property image:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Delete(':imageId')
  @HttpCode(HttpStatus.OK)
  async deletePropertyImage(
    @Param() params: DeletePropertyImageParamsDto,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Delete property image request received for image: ${params.imageId}`);

      await this.propertyImageService.deletePropertyImage({
        user,
        params: { propertyId: params.propertyId, imageId: params.imageId },
      });

      return res.status(HttpStatus.OK).json({ message: 'Property image deleted successfully' });
    } catch (error) {
      this.logger.error(`Error deleting property image:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  async reorderPropertyImages(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: ReorderPropertyImagesDto,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Reorder property images request received for property: ${propertyId}`);

      await this.propertyImageService.reorderPropertyImages({
        user,
        params: { propertyId },
        payload: body,
      });

      return res.status(HttpStatus.OK).json({ message: 'Property images reordered successfully' });
    } catch (error) {
      this.logger.error(`Error reordering property images:`, error.message);
      return this.handleError(res, error);
    }
  }
}
