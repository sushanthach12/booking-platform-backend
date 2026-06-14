/** Direction of a ledger entry against the host's balance. */
export enum EWalletTransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

/** What a ledger entry represents. */
export enum EWalletTransactionCategory {
  BOOKING_EARNING = 'booking_earning',
  PLATFORM_FEE = 'platform_fee',
  PAYOUT = 'payout',
  REFUND_CLAWBACK = 'refund_clawback',
  ADJUSTMENT = 'adjustment',
}

/**
 * Lifecycle of a ledger entry:
 * - `on_hold`   — BOOKING_EARNING credited, inside the grace window.
 * - `released`  — earning past the grace window, moved to available.
 * - `completed` — non-held entry (fee, payout, clawback) that is final.
 * - `reversed`  — entry undone (e.g. a payout that failed).
 */
export enum EWalletTransactionStatus {
  ON_HOLD = 'on_hold',
  RELEASED = 'released',
  COMPLETED = 'completed',
  REVERSED = 'reversed',
}
