import type {
  EBeneficiaryStatus,
  EPayoutAccountType,
} from '../enums/payout-account.enum';

/** Details needed to register a host as a payout beneficiary. */
export interface RegisterBeneficiaryInput {
  /** Our deterministic beneficiary id, e.g. `HOST_<hostId>`. */
  beneficiaryId: string;
  name: string;
  accountType: EPayoutAccountType;
  email?: string;
  phone?: string;
  /** Bank only. */
  accountNumber?: string;
  ifsc?: string;
  /** UPI only. */
  upiId?: string;
}

export interface BeneficiaryResult {
  beneficiaryId: string;
  status: EBeneficiaryStatus;
}

/** Details needed to initiate a transfer. */
export interface CreateTransferInput {
  /** Idempotent transfer id, e.g. `PAYOUT_<payoutId>` — the provider dedupes on it. */
  transferId: string;
  amount: number;
  beneficiaryId: string;
  mode: 'imps' | 'upi';
  remarks?: string;
}

export interface TransferResult {
  transferId: string;
  cfTransferId: string | null;
  /** Raw provider status (RECEIVED / PENDING / SUCCESS / FAILED / ...). */
  status: string;
  /** True when the provider accepted the transfer (in flight); false = rejected. */
  accepted: boolean;
}

/** Normalized payout webhook event. */
export interface PayoutWebhookEvent {
  /** Our transfer id (`PAYOUT_<payoutId>`). */
  transferId: string;
  eventType: string;
  statusCode: string | null;
  statusDescription: string | null;
  transferUtr: string | null;
  /** What the event means for our payout record. */
  outcome: 'paid' | 'failed' | 'processing' | 'ignored';
}

/**
 * Result of verifying + parsing a payout webhook. Mirrors the PG's
 * `WebhookPaymentResult`: the gateway does the validation and the caller just
 * checks `valid` and acts on `event`.
 */
export interface PayoutWebhookResult {
  /** True when the signature verified and the body parsed. */
  valid: boolean;
  error?: string;
  /** Normalized event — present only when `valid`. */
  event?: PayoutWebhookEvent;
}

/**
 * Provider-agnostic payout gateway. Concrete implementations (e.g. Cashfree
 * Payouts v2) are selected at runtime by `PayoutGatewayFactory`.
 */
export interface IPayoutGateway {
  /**
   * Register (or re-link an existing) beneficiary. If the provider reports the
   * beneficiary already exists, the existing record is fetched and returned.
   * Throws on transport / unexpected API errors.
   */
  registerBeneficiary(
    input: RegisterBeneficiaryInput,
  ): Promise<BeneficiaryResult>;

  /** Fetch a beneficiary's current status; null if not found. */
  getBeneficiary(beneficiaryId: string): Promise<BeneficiaryResult | null>;

  /**
   * Initiate a transfer (idempotent on `transferId`). On a 5XX from the provider
   * the gateway first GETs the transfer to avoid double-paying, and only throws
   * (for the caller to retry) if it confirms the transfer was not created.
   */
  createTransfer(input: CreateTransferInput): Promise<TransferResult>;

  /** Fetch a transfer's current status; null if not found. */
  getTransfer(transferId: string): Promise<TransferResult | null>;

  /**
   * Verify a payout webhook's HMAC-SHA256 signature (`timestamp + rawBody`) and
   * parse the body into a normalized event. Returns `{ valid: false, error }`
   * when the signature is missing/invalid or the body can't be parsed.
   */
  webhookPayout(
    rawBody: string,
    signature: string,
    timestamp: string,
  ): PayoutWebhookResult;
}
