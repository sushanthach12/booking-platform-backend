import type { PayoutStatus } from '../../entities/payout.entity';

export interface IPayout {
  id: string;
  hostId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  scheduledDate: string;
  paidAt: Date | null;
  createdAt: Date;
}

export interface IPayoutRepository {
  findByHost(
    hostId: string,
    page: number,
    limit: number,
  ): Promise<{ items: IPayout[]; total: number }>;
  findUpcoming(hostId: string): Promise<IPayout[]>;
  create(data: Omit<IPayout, 'id' | 'createdAt'>): Promise<IPayout>;
}

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
}
