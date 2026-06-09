import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutAccountEntity } from '../../entities/payout-account.entity';
import type { IPayoutAccountRepository } from '../interfaces/payout-account.repository.interface';

@Injectable()
export class PayoutAccountRepository implements IPayoutAccountRepository {
  constructor(
    @InjectRepository(PayoutAccountEntity)
    private readonly repo: Repository<PayoutAccountEntity>,
  ) {}

  async findByHost(hostId: string): Promise<PayoutAccountEntity[]> {
    return this.repo.find({
      where: { hostId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  async countByHost(hostId: string): Promise<number> {
    return this.repo.count({ where: { hostId } });
  }

  async create(
    data: Partial<PayoutAccountEntity>,
  ): Promise<PayoutAccountEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }
}
