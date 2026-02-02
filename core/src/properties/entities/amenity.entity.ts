import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PropertyAmenityEntity } from './property-amenity.entity';

export enum AmenityCategory {
  ESSENTIALS = 'essentials',
  FEATURES = 'features',
  LOCATION = 'location',
  SAFETY = 'safety',
}

@Entity('amenities')
export class Amenity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  category: AmenityCategory;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(
    () => PropertyAmenityEntity,
    (propertyAmenityEntity) => propertyAmenityEntity.amenity,
  )
  propertyAmenities: PropertyAmenityEntity[];
}
