import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PROPERTY_REPOSITORY } from 'src/database';
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
import { PropertyRepository } from './repositories/implementations/property.implementation';
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
  controllers: [PropertyController],
  providers: [
    PropertyService,
    {
      provide: PROPERTY_REPOSITORY,
      useClass: PropertyRepository,
    },
  ],
  exports: [PropertyService],
})
export class PropertyModule {}
