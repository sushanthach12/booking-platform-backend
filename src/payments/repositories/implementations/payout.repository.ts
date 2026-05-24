import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutEntity } from '../../entities/payout.entity';
import type {
  IPayout,
  IPayoutRepository,
} from '../interfaces/payout.interface';

export class PayoutRepository implements IPayoutRepository {
  constructor(
    @InjectRepository(PayoutEntity)
    private readonly repo: Repository<PayoutEntity>,
  ) {}

  async findByHost(
    hostId: string,
    page: number,
    limit: number,
  ): Promise<{ items: IPayout[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      where: { hostId },
      order: { scheduledDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: items as IPayout[], total };
  }

  async findUpcoming(hostId: string): Promise<IPayout[]> {
    return this.repo.find({
      where: { hostId, status: 'pending' },
      order: { scheduledDate: 'ASC' },
      take: 5,
    }) as Promise<IPayout[]>;
  }

  async create(data: Omit<IPayout, 'id' | 'createdAt'>): Promise<IPayout> {
    const entity = this.repo.create(data as PayoutEntity);
    return this.repo.save(entity) as Promise<IPayout>;
  }
}
