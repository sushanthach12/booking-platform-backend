import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EPropertyStatus } from '../enums/property.enum';
import { AvailabilityCalenderEntity } from './availablity-calender.entity';
import { HouseRuleEntity } from './house-rules.entity';
import { PropertyAmenityEntity } from './property-amenity.entity';
import { PropertyDetailsEntity } from './property-details.entity';
import { PropertyImageEntity } from './property-image.entity';
import { PropertyLocationEntity } from './property-location.entity';
import { PropertyPolicyEntity } from './property-policy.entity';
import { PropertyPricingEntity } from './property-pricing.entity';
import { PropertyRatingEntity } from './property-rating.entity';
import { RoomEntity } from './rooms.entity';

@Entity('properties')
export class PropertyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'host_id' })
  hostId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'property_type',
  })
  propertyType: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: EPropertyStatus.ACTIVE,
  })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => PropertyLocationEntity, (location) => location.property, {
    cascade: true,
  })
  location: PropertyLocationEntity;

  @OneToOne(() => PropertyPricingEntity, (pricing) => pricing.property, {
    cascade: true,
  })
  pricing: PropertyPricingEntity;

  @OneToOne(() => PropertyDetailsEntity, (details) => details.property, {
    cascade: true,
  })
  details: PropertyDetailsEntity;

  @OneToOne(() => PropertyPolicyEntity, (policies) => policies.property, {
    cascade: true,
  })
  policies: PropertyPolicyEntity;

  @OneToOne(() => PropertyRatingEntity, (ratings) => ratings.property, {
    cascade: true,
  })
  ratings: PropertyRatingEntity;

  @OneToMany(() => RoomEntity, (room) => room.property, { cascade: true })
  rooms: RoomEntity[];

  @OneToMany(() => PropertyAmenityEntity, (amenity) => amenity.property, {
    cascade: true,
  })
  amenities: PropertyAmenityEntity[];

  @OneToMany(() => PropertyImageEntity, (image) => image.property, {
    cascade: true,
  })
  images: PropertyImageEntity[];

  @OneToMany(() => HouseRuleEntity, (rule) => rule.property, { cascade: true })
  houseRules: HouseRuleEntity[];

  @OneToMany(
    () => AvailabilityCalenderEntity,
    (availability) => availability.property,
    { cascade: true },
  )
  availability: AvailabilityCalenderEntity[];
}
