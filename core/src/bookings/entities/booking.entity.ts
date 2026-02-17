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

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

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

  @Column({ name: 'guest_count', type: 'int', default: 1 })
  guestCount: number;

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
