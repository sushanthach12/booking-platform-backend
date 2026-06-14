import type { EPayoutStatus } from '../enums/payout.enum';
import type {
  IPayout,
  IPayoutEarnings,
  IPayoutSummary,
} from '../repositories/interfaces/payout.repository.interface';

/** Result of a host-initiated payout request. */
export interface IRequestPayoutResult {
  payoutId: string;
  amount: number;
  status: EPayoutStatus;
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
  getSummary(hostId: string): Promise<IPayoutSummary>;
  getEarnings(hostId: string, months: number): Promise<IPayoutEarnings>;
  /** Host-initiated payout of the full payable balance. */
  requestPayout(hostId: string): Promise<IRequestPayoutResult>;
  /** Dispatch a pending payout to Cashfree (called by the dispatch worker). */
  dispatchPayout(payoutId: string): Promise<void>;
  /** Process a verified payout webhook (reconcile status, reverse on failure). */
  handlePayoutWebhook(
    rawBody: string,
    signature: string,
    timestamp: string,
  ): Promise<void>;
}
