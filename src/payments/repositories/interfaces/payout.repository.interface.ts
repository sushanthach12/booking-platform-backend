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
  bookingCount?: number;
  accountLast4?: string | null;
}

export interface IPayoutSummary {
  totalPaidOut: number;
  paidOutSince: string | null;
  thisMonth: number;
  currency: string;
}

export interface IEarningsPoint {
  month: string;
  amount: number;
}

export interface IPayoutEarnings {
  points: IEarningsPoint[];
  currency: string;
  yoyChange: number | null;
}

export interface IPayoutRepository {
  findByHost(
    hostId: string,
    page: number,
    limit: number,
  ): Promise<{ items: IPayout[]; total: number }>;
  findUpcoming(hostId: string): Promise<IPayout[]>;
  create(data: Omit<IPayout, 'id' | 'createdAt'>): Promise<IPayout>;
  /** Aggregate paid-out totals + this-month net for a host. */
  getSummary(hostId: string): Promise<IPayoutSummary>;
  /** Net paid amount grouped by calendar month for the lookback window. */
  getMonthlyPaid(
    hostId: string,
    fromDate: string,
  ): Promise<{ period: string; amount: number }[]>;
}
