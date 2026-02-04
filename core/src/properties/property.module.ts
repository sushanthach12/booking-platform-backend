import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PROPERTY_AMENITY_REPOSITORY,
  PROPERTY_IMAGE_REPOSITORY,
  PROPERTY_REPOSITORY,
} from '../database';
import { PropertyAmenityController } from './controllers/property-amenity.controller';
import { PropertyImageController } from './controllers/property-image.controller';
import { PropertyController } from './controllers/property.controller';
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
import { PropertyRepository } from './repositories';
import { PropertyAmenityRepository } from './repositories/implementations/property-amenity.repository';
import { PropertyImageRepository } from './repositories/implementations/property-image.repository';
import { PropertyAmenityService } from './services/property-amenity.service';
import { PropertyImageService } from './services/property-image.service';
import { PropertyService } from './services/property.service';

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
  controllers: [
    PropertyController,
    PropertyImageController,
    PropertyAmenityController,
  ],
  providers: [
    PropertyService,
    PropertyImageService,
    PropertyAmenityService,
    {
      provide: PROPERTY_REPOSITORY,
      useClass: PropertyRepository,
    },
    {
      provide: PROPERTY_IMAGE_REPOSITORY,
      useClass: PropertyImageRepository,
    },
    {
      provide: PROPERTY_AMENITY_REPOSITORY,
      useClass: PropertyAmenityRepository,
    },
  ],
  exports: [PropertyService],
})
export class PropertyModule {}
