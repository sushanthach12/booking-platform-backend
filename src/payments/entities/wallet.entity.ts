import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * A host's earnings balance — a cached aggregate over the wallet-transaction
 * ledger (which is the source of truth). One row per host. NOT a stored-value
 * wallet: money only ever flows in from booking earnings, never topped up.
 *
 * Three buckets:
 * - `pendingBalance`  — credited but still on hold (inside the grace window).
 * - `availableBalance` — past the grace window; feeds "payable now".
 * - `reserveBalance`  — held back (not withdrawable) to absorb fees / clawbacks.
 *
 * All mutations happen inside a DB transaction under a pessimistic row lock.
 * `version` is bumped on every save for optimistic-read auditing.
 */
@Entity('wallets')
@Index(['hostId'], { unique: true })
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  hostId: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  availableBalance: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  pendingBalance: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  reserveBalance: number;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
