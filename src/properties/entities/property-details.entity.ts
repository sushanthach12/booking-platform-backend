import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PropertyEntity } from './property.entity';

@Entity('property_details')
@Index(['propertyId'], { unique: true })
export class PropertyDetailsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'property_id', unique: true })
  propertyId: string;

  @Column({ type: 'integer', name: 'max_guests' })
  maxGuests: number;

  @Column({ type: 'integer', default: 1 })
  bedrooms: number;

  @Column({ type: 'integer', default: 1 })
  beds: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 1.0 })
  bathrooms: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => PropertyEntity, (property) => property.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;
}
