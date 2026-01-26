import { Controller, Get } from '@nestjs/common';
import { PropertyService } from '../services/property.service';

@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get('list')
  async find() {
    return this.propertyService.find();
  }
}
