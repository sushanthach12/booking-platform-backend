import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransactionEntity } from '../../entities/payment-transaction.entity';
import {
  CreatePaymentTransactionData,
  IPaymentTransactionRepository,
} from '../interfaces/payment-transaction.repository.interface';

@Injectable()
export class PaymentTransactionRepository implements IPaymentTransactionRepository {
  constructor(
    @InjectRepository(PaymentTransactionEntity)
    private readonly repository: Repository<PaymentTransactionEntity>,
  ) {}

  async create(
    data: CreatePaymentTransactionData,
  ): Promise<PaymentTransactionEntity> {
    const entity = this.repository.create(data);
    return await this.repository.save(entity);
  }

  async findById(id: string): Promise<PaymentTransactionEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async update(
    id: string,
    data: Partial<PaymentTransactionEntity>,
  ): Promise<void> {
    await this.repository.update(id, data);
  }
}
