import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import { CreatePropertyDto } from '../dto/create-property.dto';
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
}
