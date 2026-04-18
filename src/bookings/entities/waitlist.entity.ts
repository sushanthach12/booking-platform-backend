import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WaitlistState } from '../enums/waitlist-state.enum';

@Entity('waitlist')
@Index(['propertyId', 'checkInDate', 'checkOutDate', 'priority'], {
  where: "state = 'waitlisted'",
})
@Index(['userId', 'state'])
@Index(['state', 'expiresAt'], {
  where: "state IN ('invited', 'booking_in_progress')",
})
export class WaitlistEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: Date;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate: Date;

  @Column({ name: 'priority', type: 'bigint' })
  priority: number;

  @Column({
    name: 'state',
    type: 'varchar',
    length: 30,
    default: WaitlistState.WAITLISTED,
  })
  state: WaitlistState;

  @Column({ name: 'slot_reservation_id', type: 'uuid', nullable: true })
  slotReservationId?: string;

  @Column({ name: 'notified_at', type: 'timestamp', nullable: true })
  notifiedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
