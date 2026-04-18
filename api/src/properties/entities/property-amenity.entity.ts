import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Amenity } from './amenity.entity';
import { PropertyEntity } from './property.entity';

@Entity('property_amenities')
@Unique(['propertyId', 'amenityId'])
export class PropertyAmenityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @Column({ type: 'uuid', name: 'amenity_id' })
  amenityId: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => PropertyEntity, (property) => property.amenities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @ManyToOne(() => Amenity, (amenity) => amenity.propertyAmenities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'amenity_id' })
  amenity: Amenity;
}
