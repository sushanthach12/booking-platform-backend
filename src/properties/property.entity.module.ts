import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AVAILABILITY_CALENDAR_REPOSITORY,
  PROPERTY_AMENITY_REPOSITORY,
  PROPERTY_IMAGE_REPOSITORY,
  PROPERTY_REPOSITORY,
} from '../database';
import {
  Amenity,
  AvailabilityCalenderEntity,
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
import {
  AvailabilityCalendarRepository,
  PropertyAmenityRepository,
  PropertyImageRepository,
  PropertyRepository,
} from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PropertyEntity,
      AvailabilityCalenderEntity,
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
  providers: [
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
    {
      provide: AVAILABILITY_CALENDAR_REPOSITORY,
      useClass: AvailabilityCalendarRepository,
    },
  ],
  exports: [
    PROPERTY_REPOSITORY,
    PROPERTY_IMAGE_REPOSITORY,
    PROPERTY_AMENITY_REPOSITORY,
    AVAILABILITY_CALENDAR_REPOSITORY,
  ],
})
export class PropertyEntityModule {}
