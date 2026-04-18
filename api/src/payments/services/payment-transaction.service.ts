import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_TRANSACTION_REPOSITORY } from '../../database';
import { PaymentTransactionEntity } from '../entities/payment-transaction.entity';
import { IPaymentTransactionData } from '../interfaces/payment.interface';
import {
  CreatePaymentTransactionData,
  IPaymentTransactionRepository,
} from '../repositories/interfaces/payment-transaction.repository.interface';

export interface IPaymentTransactionService {
  create(data: CreatePaymentTransactionData): Promise<IPaymentTransactionData>;
  findById(id: string): Promise<IPaymentTransactionData | null>;
  update(id: string, data: Partial<PaymentTransactionEntity>): Promise<void>;
  updateStatus(
    id: string,
    status: string,
    errorMessage?: string,
  ): Promise<void>;
}

function toData(entity: PaymentTransactionEntity): IPaymentTransactionData {
  return {
    id: entity.id,
    amount: Number(entity.amount),
    currency: entity.currency,
    status: entity.status,
    gatewayStatus: entity.gatewayStatus ?? undefined,
    gatewayType: entity.gatewayType,
    gatewayOrderId: entity.gatewayOrderId ?? undefined,
    gatewayPaymentId: entity.gatewayPaymentId ?? undefined,
    paymentLinkId: entity.paymentLinkId ?? undefined,
    paymentSessionId: entity.paymentSessionId ?? undefined,
    bookingId: entity.bookingId ?? undefined,
    guestId: entity.guestId,
    propertyId: entity.propertyId ?? undefined,
    metadata: entity.metadata ?? undefined,
    webhookData: entity.webhookData ?? undefined,
    errorMessage: entity.errorMessage ?? undefined,
    expiresAt: entity.expiresAt ?? undefined,
    processedAt: entity.processedAt ?? undefined,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class PaymentTransactionService implements IPaymentTransactionService {
  constructor(
    @Inject(PAYMENT_TRANSACTION_REPOSITORY)
    private readonly repository: IPaymentTransactionRepository,
  ) {}

  async create(
    data: CreatePaymentTransactionData,
  ): Promise<IPaymentTransactionData> {
    const entity = await this.repository.create(data);
    return toData(entity);
  }

  async findById(id: string): Promise<IPaymentTransactionData | null> {
    const entity = await this.repository.findById(id);
    return entity ? toData(entity) : null;
  }

  async update(
    id: string,
    data: Partial<PaymentTransactionEntity>,
  ): Promise<void> {
    await this.repository.update(id, data);
  }

  async updateStatus(
    id: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.repository.update(id, {
      status,
      errorMessage,
      updatedAt: new Date(),
    });
  }
}
