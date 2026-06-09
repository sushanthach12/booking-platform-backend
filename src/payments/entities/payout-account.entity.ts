import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A host's linked bank account for receiving payouts. Sensitive fields
 * (full account number, IFSC) are stored AES-256-GCM encrypted and are
 * NEVER returned to the client — only `last4` is exposed.
 */
@Entity('payout_accounts')
@Index(['hostId'])
export class PayoutAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  hostId: string;

  @Column({ type: 'varchar', length: 120 })
  accountHolderName: string;

  @Column({ type: 'varchar', length: 120 })
  bankName: string;

  /** AES-256-GCM ciphertext. Never returned to the client. */
  @Column({ type: 'varchar', length: 255 })
  ifscEncrypted: string;

  /** AES-256-GCM ciphertext. Never returned to the client. */
  @Column({ type: 'varchar', length: 255 })
  accountNumberEncrypted: string;

  /** Last 4 digits of the account number — safe to display. */
  @Column({ type: 'varchar', length: 4 })
  last4: string;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
