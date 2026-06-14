import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('booking_invitations')
@Index(['status', 'expiresAt'], { where: "status = 'active'" })
@Index(['userId', 'status'])
export class BookingInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'waitlist_entry_id', type: 'uuid' })
  waitlistEntryId: string;

  @Column({ name: 'slot_reservation_id', type: 'uuid' })
  slotReservationId: string;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: Date;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'booking_window_duration', type: 'int' })
  bookingWindowDuration: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: 'active' | 'accepted' | 'expired' | 'cancelled';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt?: Date;
}
