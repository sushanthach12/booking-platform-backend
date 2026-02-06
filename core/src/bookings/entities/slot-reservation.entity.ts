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

@Entity('slot_reservations')
@Index(['propertyId', 'checkInDate', 'checkOutDate'], { where: "status IN ('reserved', 'booked')" })
@Index(['reservedUntil'], { where: "status = 'reserved'" })
export class SlotReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId: string;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: Date;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate: Date;

  @Column({ name: 'waitlist_entry_id', type: 'uuid' })
  waitlistEntryId: string;

  @Column({ name: 'reserved_until', type: 'timestamp' })
  reservedUntil: Date;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'reserved',
  })
  status: 'reserved' | 'booked' | 'expired' | 'released';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
