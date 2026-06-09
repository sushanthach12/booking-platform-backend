import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PayoutStatus = 'pending' | 'paid' | 'failed';

@Entity('payouts')
@Index(['hostId'])
@Index(['status'])
export class PayoutEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  hostId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  /** ISO-4217 alpha-3. India/INR platform — see frontend PAYOUT_CURRENCY. */
  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: PayoutStatus;

  @Column({ type: 'date' })
  scheduledDate: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  /** Number of bookings rolled into this payout (UI projection). */
  @Column({ type: 'int', default: 0 })
  bookingCount: number;

  /** Last 4 digits of the destination account this payout was sent to. */
  @Column({ type: 'varchar', length: 4, nullable: true })
  accountLast4: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
