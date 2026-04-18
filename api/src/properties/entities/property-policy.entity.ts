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
import { EPropertyCancellationPolicy } from '../enums/property.enum';
import { PropertyEntity } from './property.entity';

@Entity('property_policies')
@Index(['propertyId'], { unique: true })
export class PropertyPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'property_id', unique: true })
  propertyId: string;

  @Column({ type: 'integer', name: 'min_nights', default: 1 })
  minNights: number;

  @Column({ type: 'integer', name: 'max_nights', default: 365 })
  maxNights: number;

  @Column({ type: 'time', name: 'check_in_time', default: '15:00' })
  checkInTime: string;

  @Column({ type: 'time', name: 'check_out_time', default: '11:00' })
  checkOutTime: string;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'cancellation_policy',
    default: EPropertyCancellationPolicy.FLEXIBLE,
  })
  cancellationPolicy: string;

  @Column({ type: 'boolean', name: 'instant_book', default: false })
  instantBook: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => PropertyEntity, (property) => property.policies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;
}
