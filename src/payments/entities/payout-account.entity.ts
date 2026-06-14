import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  EBeneficiaryStatus,
  EPayoutAccountType,
} from '../enums/payout-account.enum';

/**
 * A host's linked payout account (bank or UPI). Sensitive fields (account
 * number, IFSC, UPI id) are stored AES-256-GCM encrypted and are NEVER returned
 * to the client — only `last4` is exposed. Registered as a Cashfree beneficiary;
 * payouts are only allowed once `beneficiaryStatus` is `verified`.
 */
@Entity('payout_accounts')
@Index(['hostId'])
export class PayoutAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  hostId: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: EPayoutAccountType.BANK,
  })
  accountType: EPayoutAccountType;

  @Column({ type: 'varchar', length: 120 })
  accountHolderName: string;

  @Column({ type: 'varchar', length: 120 })
  bankName: string;

  /** AES-256-GCM ciphertext. Never returned to the client. Bank only. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  ifscEncrypted: string | null;

  /** AES-256-GCM ciphertext. Never returned to the client. Bank only. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  accountNumberEncrypted: string | null;

  /** AES-256-GCM ciphertext of the UPI VPA. Never returned. UPI only. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  upiIdEncrypted: string | null;

  /** Last 4 digits (bank) or VPA handle (UPI) — safe to display. */
  @Column({ type: 'varchar', length: 4 })
  last4: string;

  /** Cashfree beneficiary id, set once registration is accepted. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  cashfreeBeneficiaryId: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: EBeneficiaryStatus.INITIATED,
  })
  beneficiaryStatus: EBeneficiaryStatus;

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
