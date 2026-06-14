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

  async findByIdAndHost(
    id: string,
    hostId: string,
  ): Promise<PayoutAccountEntity | null> {
    return this.repo.findOne({ where: { id, hostId } });
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

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async setPrimary(id: string, hostId: string): Promise<void> {
    await this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(PayoutAccountEntity);
      await repo.update({ hostId }, { isPrimary: false });
      await repo.update({ id, hostId }, { isPrimary: true });
    });
  }
}
