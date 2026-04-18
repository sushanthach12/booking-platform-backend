import { Inject, Injectable } from '@nestjs/common';
import { PAYOUT_REPOSITORY } from '../../database/di/symbols';
import type { IPayout, IPayoutRepository, IPayoutService } from '../interfaces/payout.interface';

@Injectable()
export class PayoutService implements IPayoutService {
  constructor(
    @Inject(PAYOUT_REPOSITORY)
    private readonly payoutRepository: IPayoutRepository,
  ) {}

  async getPayouts(
    hostId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: IPayout[]; total: number; page: number; limit: number }> {
    const { items, total } = await this.payoutRepository.findByHost(hostId, page, limit);
    return { items, total, page, limit };
  }

  async getUpcoming(
    hostId: string,
  ): Promise<{ amount: number; currency: string; scheduledDate: string } | null> {
    const upcoming = await this.payoutRepository.findUpcoming(hostId);
    if (!upcoming.length) return null;
    const next = upcoming[0];
    return {
      amount: Number(next.amount),
      currency: next.currency,
      scheduledDate: next.scheduledDate,
    };
  }
}
