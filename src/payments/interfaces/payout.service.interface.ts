import type {
  IPayout,
  IPayoutEarnings,
  IPayoutSummary,
} from '../repositories/interfaces/payout.repository.interface';

export interface IPayoutService {
  getPayouts(
    hostId: string,
    page: number,
    limit: number,
  ): Promise<{ items: IPayout[]; total: number; page: number; limit: number }>;
  getUpcoming(hostId: string): Promise<{
    amount: number;
    currency: string;
    scheduledDate: string;
  } | null>;
  getSummary(hostId: string): Promise<IPayoutSummary>;
  getEarnings(hostId: string, months: number): Promise<IPayoutEarnings>;
}
