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
import { ECurrency } from '../../common/enums/currency.enum';
import { PropertyEntity } from './property.entity';

@Entity('property_pricing')
@Index(['propertyId'], { unique: true })
export class PropertyPricingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'property_id', unique: true })
  propertyId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'base_price' })
  basePrice: number;

  @Column({ type: 'varchar', length: 3, default: ECurrency.INR })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'cleaning_fee',
    default: 0,
  })
  cleaningFee: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'service_fee_percentage',
    default: 10.0,
  })
  serviceFeePercentage: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => PropertyEntity, (property) => property.pricing, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;
}
