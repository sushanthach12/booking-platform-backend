import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  EWalletTransactionCategory,
  EWalletTransactionStatus,
  EWalletTransactionType,
} from '../enums/wallet.enum';

/**
 * The earnings ledger — the immutable, double-entry source of truth behind a
 * host's wallet balance. Every credit and debit is one row tied to a booking
 * or payout.
 *
 * Money model for a booking earning:
 * - one `BOOKING_EARNING` CREDIT whose `amount` is the host's **net** share
 *   (`hostNet`) — this is what lands in `pendingBalance` and later releases.
 * - one `PLATFORM_FEE` DEBIT whose `amount` is the commission (platform
 *   revenue). It does NOT touch the host's balance; summing these = revenue.
 * Gross (grand total) is recoverable as `BOOKING_EARNING + PLATFORM_FEE`.
 */
@Entity('wallet_transactions')
@Index(['hostId'])
@Index(['walletId'])
// Release-sweep query: WHERE status = 'ON_HOLD' AND releaseAt <= NOW().
@Index(['status', 'releaseAt'])
// Exactly one earning credit per booking → idempotent crediting (partial unique).
@Index('UQ_wallet_txn_booking_earning', ['bookingId'], {
  unique: true,
  where: `"category" = 'booking_earning'`,
})
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  hostId: string;

  @Column({ type: 'uuid' })
  walletId: string;

  @Column({ type: 'varchar', length: 10 })
  type: EWalletTransactionType;

  @Column({ type: 'varchar', length: 20 })
  category: EWalletTransactionCategory;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  /** Host balance (available + pending) immediately after this entry. Audit. */
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  balanceAfter: number;

  @Column({ type: 'varchar', length: 20 })
  status: EWalletTransactionStatus;

  @Column({ type: 'uuid', nullable: true })
  bookingId: string | null;

  @Column({ type: 'uuid', nullable: true })
  payoutId: string | null;

  /** UTC instant the on-hold earning becomes available. Drives the sweep. */
  @Column({ type: 'timestamptz', nullable: true })
  releaseAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
