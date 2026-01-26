import { Inject, Injectable } from '@nestjs/common';
import { PROPERTY_REPOSITORY } from 'src/database';
import { IPropertyRepository } from '../repositories';

@Injectable()
export class PropertyService {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  // list properties
  async find() {
    return this.propertyRepository.findProperties();
  }
}
