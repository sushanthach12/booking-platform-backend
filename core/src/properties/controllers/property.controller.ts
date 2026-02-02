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

  @Post()
  @HttpCode(HttpStatus.OK)
  async createProperty(
    @Res() res: Response,
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePropertyDto,
  ) {
    this.logger.log(`Create property request received`);

    const response = await this.propertyService.createProperty({
      payload: body,
      user,
    });

    return res.status(HttpStatus.OK).json({ data: response });
  }
}
