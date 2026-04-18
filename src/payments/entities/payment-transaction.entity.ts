import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  PaymentGatewayType,
  PaymentStatus,
} from '../interfaces/payment.interface';

@Entity('payment_transactions')
export class PaymentTransactionEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: PaymentStatus.PENDING,
  })
  status: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gatewayStatus: string;

  @Column({
    type: 'varchar',
    default: PaymentGatewayType.CASHFREE,
  })
  gatewayType: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  gatewayOrderId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  gatewayPaymentId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  paymentLinkId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  paymentSessionId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bookingId: string;

  @Column({ type: 'varchar', length: 255 })
  guestId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  propertyId: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  webhookData: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
