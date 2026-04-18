import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  BookingPriceItemCalculationMode,
  BookingPriceItemType,
} from '../enums/booking-price-item.enum';
import { BookingEntity } from './booking.entity';

@Entity('booking_price_items')
@Index(['bookingId'])
@Index(['bookingId', 'type'])
export class BookingPriceItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @Column({
    name: 'type',
    type: 'varchar',
    length: 30,
  })
  type: BookingPriceItemType;

  @Column({
    name: 'calculation_mode',
    type: 'varchar',
    length: 20,
  })
  calculationMode: BookingPriceItemCalculationMode;

  /** Original value (e.g. 10 for 10%, or fixed amount). */
  @Column({ name: 'value', type: 'decimal', precision: 10, scale: 2 })
  value: number;

  /** Computed amount in booking currency. */
  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity;
}
