/** Destination instrument type for a host payout account. */
export enum EPayoutAccountType {
  BANK = 'bank',
  UPI = 'upi',
}

/**
 * Cashfree beneficiary verification state. Payouts are only allowed to a
 * `verified` beneficiary.
 * - `verified`  — registered and usable.
 * - `initiated` — registration accepted, verification pending (poll).
 * - `invalid`   — details rejected by Cashfree.
 * - `failed`    — registration failed.
 */
export enum EBeneficiaryStatus {
  VERIFIED = 'verified',
  INITIATED = 'initiated',
  INVALID = 'invalid',
  FAILED = 'failed',
}
