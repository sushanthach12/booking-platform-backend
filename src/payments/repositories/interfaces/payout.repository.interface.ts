import type { EntityManager } from 'typeorm';
import type { PayoutEntity } from '../../entities/payout.entity';
import type { EPayoutStatus } from '../../enums/payout.enum';

export interface IPayout {
  id: string;
  hostId: string;
  amount: number;
  currency: string;
  status: EPayoutStatus;
  scheduledDate: string;
  paidAt: Date | null;
  createdAt: Date;
  bookingCount?: number;
  accountLast4?: string | null;
  platformFee?: number;
  hostPayoutAccountId?: string | null;
  cashfreeTransferId?: string | null;
  cashfreeStatus?: string | null;
  failureReason?: string | null;
  processedAt?: Date | null;
  transferUtr?: string | null;
}

/** Fields accepted when creating a payout row. */
export interface CreatePayoutInput {
  hostId: string;
  amount: number;
  currency: string;
  status: EPayoutStatus;
  scheduledDate: string;
  bookingCount?: number;
  accountLast4?: string | null;
  platformFee?: number;
  bookingId?: string | null;
  hostPayoutAccountId?: string | null;
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
  findById(id: string): Promise<IPayout | null>;
  create(data: CreatePayoutInput, manager?: EntityManager): Promise<IPayout>;
  update(
    id: string,
    patch: Partial<PayoutEntity>,
    manager?: EntityManager,
  ): Promise<void>;
  /** Aggregate paid-out totals + this-month net for a host. */
  getSummary(hostId: string): Promise<IPayoutSummary>;
  /** Sum of payouts dispatched but not yet confirmed (status = 'processing'). */
  getInTransitTotal(hostId: string): Promise<number>;
  /** Net paid amount grouped by calendar month for the lookback window. */
  getMonthlyPaid(
    hostId: string,
    fromDate: string,
  ): Promise<{ period: string; amount: number }[]>;
}
