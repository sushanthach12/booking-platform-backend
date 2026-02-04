import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PROPERTY_REPOSITORY } from '../database';
import { PropertyController } from './controllers/property.controller';
import { PropertyImageController } from './controllers/property-image.controller';
import { PropertyAmenityController } from './controllers/property-amenity.controller';
import {
  Amenity,
  HouseRuleEntity,
  PropertyAmenityEntity,
  PropertyDetailsEntity,
  PropertyEntity,
  PropertyImageEntity,
  PropertyLocationEntity,
  PropertyPolicyEntity,
  PropertyPricingEntity,
  PropertyRatingEntity,
  RoomEntity,
} from './entities';
import { PropertyImageRepository } from './repositories/implementations/property-image.repository';
import { PropertyAmenityRepository } from './repositories/implementations/property-amenity.repository';
import { PropertyService } from './services/property.service';
import { PropertyImageService } from './services/property-image.service';
import { PropertyAmenityService } from './services/property-amenity.service';
import { PropertyRepository } from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PropertyEntity,
      Amenity,
      PropertyLocationEntity,
      PropertyAmenityEntity,
      PropertyRatingEntity,
      PropertyImageEntity,
      RoomEntity,
      HouseRuleEntity,
      PropertyDetailsEntity,
      PropertyPolicyEntity,
      PropertyPricingEntity,
    ]),
  ],
  controllers: [PropertyController, PropertyImageController, PropertyAmenityController],
  providers: [
    PropertyService,
    PropertyImageService,
    PropertyAmenityService,
    {
      provide: PROPERTY_REPOSITORY,
      useClass: PropertyRepository,
    },
    {
      provide: 'PROPERTY_IMAGE_REPOSITORY',
      useClass: PropertyImageRepository,
    },
    {
      provide: 'PROPERTY_AMENITY_REPOSITORY',
      useClass: PropertyAmenityRepository,
    },
  ],
  exports: [PropertyService],
})
export class PropertyModule {}
