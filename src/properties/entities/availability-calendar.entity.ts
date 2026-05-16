import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PropertyEntity, RoomEntity } from '.';

@Entity('availability_calendar')
@Unique(['propertyId', 'roomId', 'date'])
@Index('idx_availability_property_date', ['property', 'date'])
@Index('idx_availability_room_date', ['room', 'date'])
// @Index('idx_availability_booking', ['booking'])
export class AvailabilityCalenderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @Column({ type: 'uuid', name: 'room_id', nullable: true })
  roomId: string | null;

  @Column({ type: 'varchar', name: 'booking_id', nullable: true })
  bookingId: string | null;

  @Column({ type: 'date', name: 'date' })
  date: Date;

  @Column({ type: 'boolean', name: 'available', default: true })
  available: boolean;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'price',
    nullable: true,
  })
  price: number | null;

  @Column({ type: 'integer', name: 'min_nights', nullable: true })
  minNights: number | null;

  @Column({ type: 'integer', name: 'max_nights', nullable: true })
  maxNights: number | null;

  @Column({ type: 'text', name: 'note', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', name: 'block_reason', nullable: true })
  blockReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => PropertyEntity, (property) => property.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @ManyToOne(() => RoomEntity, (room) => room.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'room_id' })
  room: RoomEntity;
}
