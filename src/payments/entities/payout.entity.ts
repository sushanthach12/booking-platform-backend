import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EPayoutStatus } from '../enums/payout.enum';

/**
 * A payout = a transfer record to a host. In the host-initiated model a payout
 * settles the host's available balance (not a single booking), so `bookingId`
 * is usually null; the wallet ledger references the payout via its `payoutId`.
 */
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

  /** Platform fee attributed to this payout (reserved; aggregate model = 0). */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  platformFee: number;

  /** ISO-4217 alpha-3. India/INR platform — see frontend PAYOUT_CURRENCY. */
  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: EPayoutStatus.PENDING })
  status: EPayoutStatus;

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

  /** Optional single-booking linkage (aggregate payouts leave this null). */
  @Column({ type: 'uuid', nullable: true })
  bookingId: string | null;

  /** The payout account (beneficiary) this transfer was sent to. */
  @Column({ type: 'uuid', nullable: true })
  hostPayoutAccountId: string | null;

  /** `cf_transfer_id` returned by Cashfree. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  cashfreeTransferId: string | null;

  /** Raw Cashfree status_code. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  cashfreeStatus: string | null;

  /** status_code + description on failure. */
  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  /** When POST /payout/transfers was called. */
  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  /** Bank UTR on success. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  transferUtr: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
