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
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import {
  CreatePropertyImageDto,
  DeletePropertyImageParamsDto,
  ReorderPropertyImagesDto,
  UpdatePropertyImageDto,
  UpdatePropertyImageParamsDto,
} from '../dto/property-crud.dto';
import { PropertyImageService } from '../services/property-image.service';

@Controller({ path: 'properties/:propertyId/images', version: '1' })
export class PropertyImageController {
  private readonly logger = new Logger(PropertyImageController.name);

  constructor(private readonly propertyImageService: PropertyImageService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPropertyImage(
    @Param() params: UpdatePropertyImageParamsDto,
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePropertyImageDto,
  ) {
    this.logger.log(
      `Create property image request received for property: ${params.propertyId}`,
    );

    const response = await this.propertyImageService.createPropertyImage({
      user,
      params: { propertyId: params.propertyId },
      payload: body,
    });

    return { data: response };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getPropertyImages(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.logger.log(
      `Get property images request received for property: ${propertyId}`,
    );

    const response = await this.propertyImageService.getPropertyImages({
      user,
      params: { propertyId },
    });

    return { data: response };
  }

  @Patch(':imageId')
  @HttpCode(HttpStatus.OK)
  async updatePropertyImage(
    @Param() params: UpdatePropertyImageParamsDto,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdatePropertyImageDto,
  ) {
    this.logger.log(
      `Update property image request received for image: ${params.imageId}`,
    );

    const response = await this.propertyImageService.updatePropertyImage({
      user,
      params: { propertyId: params.propertyId, imageId: params.imageId },
      payload: body,
    });

    return { data: response };
  }

  @Delete(':imageId')
  @HttpCode(HttpStatus.OK)
  async deletePropertyImage(
    @Param() params: DeletePropertyImageParamsDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.logger.log(
      `Delete property image request received for image: ${params.imageId}`,
    );

    await this.propertyImageService.deletePropertyImage({
      user,
      params: { propertyId: params.propertyId, imageId: params.imageId },
    });

    return { data: { message: 'Property image deleted successfully' } };
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  async reorderPropertyImages(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: ReorderPropertyImagesDto,
  ) {
    this.logger.log(
      `Reorder property images request received for property: ${propertyId}`,
    );

    await this.propertyImageService.reorderPropertyImages({
      user,
      params: { propertyId },
      payload: body,
    });

    return { data: { message: 'Property images reordered successfully' } };
  }
}
