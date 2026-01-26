import { Controller } from '@nestjs/common';
import { PropertyService } from '../services/property.service';

@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}
}
