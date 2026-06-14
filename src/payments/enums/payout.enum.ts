/**
 * Lifecycle of a payout (transfer record):
 * - `pending`    — created, not yet dispatched to Cashfree.
 * - `processing` — dispatched, awaiting confirmation (in transit).
 * - `paid`       — Cashfree confirmed success.
 * - `failed`     — failed / reversed / rejected; the ledger debit is reversed.
 */
export enum EPayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
}
