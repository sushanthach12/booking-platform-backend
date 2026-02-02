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
import { CreatePropertyDto } from '../dto/create-property.dto';
import { PropertyService } from '../services/property.service';

@Controller('properties')
export class PropertyController {
  private readonly logger = new Logger(PropertyController.name);

  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async register(@Res() res: Response, @Body() body: CreatePropertyDto) {
    this.logger.log(`Register request received for email`);

    const response = await this.propertyService.createProperty({
      payload: body,
    });

    return res.status(HttpStatus.OK).json({ data: response });
  }
}
