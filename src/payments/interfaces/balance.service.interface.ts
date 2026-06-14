/**
 * Host earnings balance, derived from the wallet + ledger. This is the shape
 * the Payout screen consumes (see web IPayoutBalance).
 */
export interface IHostBalance {
  /** Withdrawable now: `max(0, available − reserve)`. Threshold gates the action. */
  payableNow: number;
  onHold: {
    /** Projected net from CONFIRMED-but-not-completed bookings (not yet credited). */
    upcoming: number;
    /** Credited earnings still inside the grace window (= pendingBalance). */
    clearing: number;
  };
  /** Payouts dispatched, awaiting Cashfree confirmation. */
  inTransit: number;
  /** Sum of completed payouts. */
  lifetimePaidOut: number;
  availableBalance: number;
  reserveBalance: number;
  minPayoutThreshold: number;
  currency: string;
}

export interface IBalanceService {
  /**
   * Idempotently credit a completed booking's net earning to the host's wallet
   * as an on-hold entry (releases after the grace window). No-op if already
   * credited for this booking.
   */
  creditBookingEarning(bookingId: string): Promise<void>;

  /**
   * Idempotently release a single on-hold earning: move its net from pending to
   * available. No-op if the entry is not (or no longer) ON_HOLD.
   */
  releaseEarning(walletTransactionId: string): Promise<void>;

  /**
   * Credit the host's share of a retained cancellation fee as an on-hold
   * earning (splits commission off `retainedAmount`). Idempotent via the unique
   * earning-per-booking constraint — a booking gets exactly one earning,
   * whether through completion or cancellation.
   */
  creditCancellationFee(
    bookingId: string,
    retainedAmount: number,
  ): Promise<void>;

  /**
   * Idempotently reverse a payout's PAYOUT debit (failed/reversed transfer):
   * restore the amount to available balance and mark the debit REVERSED. No-op
   * if already reversed or no debit exists.
   */
  reversePayoutDebit(payoutId: string): Promise<void>;

  /**
   * Claw back the host's share of a refund/chargeback on a COMPLETED booking
   * whose earning was already credited. The reserve absorbs it first, then
   * available (which may go negative, netting against future earnings). No-op
   * if the booking isn't completed or has no credited earning (that's the
   * cancellation path, not a clawback).
   */
  clawbackForRefund(bookingId: string, refundedAmount: number): Promise<void>;

  /** Aggregate balance view for the Payout screen. */
  getBalance(hostId: string): Promise<IHostBalance>;
}
