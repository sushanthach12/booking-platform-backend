import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ECurrency } from '../../common/enums/currency.enum';
import {
  BookingPaymentStatus,
  BookingStatus,
} from '../enums/booking-status.enum';

@Entity('bookings')
@Index(['propertyId', 'checkInDate', 'checkOutDate'])
@Index(['guestId'])
@Index(['hostId'])
@Index(['status'])
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId: string;

  @Column({ name: 'guest_id', type: 'uuid' })
  guestId: string;

  @Column({ name: 'host_id', type: 'uuid' })
  hostId: string;

  @Column({ name: 'room_id', type: 'uuid', nullable: true })
  roomId?: string;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: Date;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate: Date;

  @Column({ name: 'number_of_nights', type: 'int' })
  numberOfNights: number;

  @Column({ name: 'guest_count', type: 'int', default: 1 })
  guestCount: number;

  /** Financial summary (source of truth). Nullable until migration backfill and create flow updated. */
  @Column({
    name: 'subtotal',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  subtotal?: number;

  @Column({
    name: 'total_fees',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalFees: number;

  /** Tax rate as percentage (e.g. 10 for 10%). */
  @Column({
    name: 'tax_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    nullable: true,
  })
  taxRate?: number;

  /** Computed tax amount in booking currency. */
  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  taxAmount: number;

  @Column({
    name: 'total_discount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalDiscount: number;

  @Column({
    name: 'grand_total',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  grandTotal?: number;

  @Column({
    name: 'currency',
    type: 'varchar',
    length: 3,
    default: ECurrency.INR,
  })
  currency: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: BookingStatus.PENDING,
  })
  status: string;

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 20,
    default: BookingPaymentStatus.PENDING,
  })
  paymentStatus: string;

  @Column({ name: 'payment_intent_id', type: 'varchar', nullable: true })
  paymentIntentId?: string;

  @Column({ name: 'payment_transaction_id', type: 'varchar', nullable: true })
  paymentTransactionId?: string;

  @Column({
    name: 'booking_number',
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: true,
  })
  bookingNumber?: string;

  @Column({ name: 'idempotency_key', type: 'varchar', unique: true })
  idempotencyKey: string;

  @Column({ name: 'special_requests', type: 'text', nullable: true })
  specialRequests?: string;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason?: string;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'version', type: 'int', default: 0 })
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
