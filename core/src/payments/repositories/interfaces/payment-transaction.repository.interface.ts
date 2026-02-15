import { PaymentTransactionEntity } from '../../entities/payment-transaction.entity';

export interface CreatePaymentTransactionData extends Partial<PaymentTransactionEntity> {
  id: string;
  amount: number;
  currency: string;
  guestId: string;
  gatewayType: string;
}

export interface IPaymentTransactionRepository {
  create(data: CreatePaymentTransactionData): Promise<PaymentTransactionEntity>;
  findById(id: string): Promise<PaymentTransactionEntity | null>;
  update(id: string, data: Partial<PaymentTransactionEntity>): Promise<void>;
}
