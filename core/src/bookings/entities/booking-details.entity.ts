import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ECurrency } from '../../common/enums/currency.enum';
import { BookingEntity } from './booking.entity';

@Entity('booking_details')
@Index(['bookingId'])
export class BookingDetailsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  // Property snapshot at time of booking
  @Column({ name: 'property_title', type: 'varchar', length: 255 })
  propertyTitle: string;

  @Column({ name: 'property_description', type: 'text', nullable: true })
  propertyDescription?: string;

  @Column({ name: 'property_address', type: 'jsonb' })
  propertyAddress: Record<string, any>; // Full address object

  @Column({ name: 'property_images', type: 'jsonb', nullable: true })
  propertyImages?: string[]; // Array of image URLs

  @Column({ name: 'property_amenities', type: 'jsonb', nullable: true })
  propertyAmenities?: Record<string, any>[]; // Array of amenity objects

  @Column({ name: 'room_details', type: 'jsonb', nullable: true })
  roomDetails?: Record<string, any>; // Room-specific details if applicable

  // Pricing breakdown
  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({
    name: 'cleaning_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  cleaningFee?: number;

  @Column({
    name: 'service_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  serviceFee?: number;

  @Column({
    name: 'taxes',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  taxes?: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  discountAmount?: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({
    name: 'currency',
    type: 'varchar',
    length: 3,
    default: ECurrency.INR,
  })
  currency: string;

  // Cancellation policy snapshot
  @Column({ name: 'cancellation_policy', type: 'jsonb' })
  cancellationPolicy: Record<string, any>;

  // House rules snapshot
  @Column({ name: 'house_rules', type: 'jsonb', nullable: true })
  houseRules?: Record<string, any>[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity;
}
