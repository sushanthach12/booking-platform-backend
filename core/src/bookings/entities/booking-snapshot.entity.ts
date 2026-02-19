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
import { SnapshotAddress } from '../interfaces/booking.interface';
import { BookingEntity } from './booking.entity';

@Entity('booking_snapshot')
@Index(['bookingId'])
export class BookingSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @Column({ name: 'property_title', type: 'varchar', length: 255 })
  propertyTitle: string;

  @Column({
    name: 'property_image',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  propertyImage?: string;

  @Column({ name: 'location_label', type: 'varchar', length: 255 })
  locationLabel: string;

  @Column({ name: 'property_address', type: 'jsonb', nullable: true })
  propertyAddress?: SnapshotAddress;

  @Column({ name: 'room_name', type: 'varchar', length: 255, nullable: true })
  roomName?: string;

  @Column({ name: 'cancellation_policy', type: 'jsonb' })
  cancellationPolicy: Record<string, unknown>;

  @Column({ name: 'house_rules', type: 'jsonb', nullable: true })
  houseRules?: Record<string, unknown>[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity;
}
