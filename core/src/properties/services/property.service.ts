import { Inject, Injectable } from '@nestjs/common';
import { PROPERTY_REPOSITORY } from '../../database';
import { ICreatePropertyRequestParams } from '../interfaces/property.interface';
import { IPropertyRepository } from '../repositories';

@Injectable()
export class PropertyService {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  // list properties
  async createProperty(params: ICreatePropertyRequestParams) {
    // create the propery
  }
}
