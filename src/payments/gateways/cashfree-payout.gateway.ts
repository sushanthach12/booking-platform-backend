import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  EBeneficiaryStatus,
  EPayoutAccountType,
} from '../enums/payout-account.enum';
import { getCashfreePayoutBaseUrl } from '../helpers/cashfree.helper';
import type {
  BeneficiaryResult,
  CreateTransferInput,
  IPayoutGateway,
  PayoutWebhookEvent,
  PayoutWebhookResult,
  RegisterBeneficiaryInput,
  TransferResult,
} from '../interfaces/payout-gateway.interface';

const PAYOUT_API_VERSION = '2024-01-01';
const HTTP_CONFLICT = 409;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;
/** Raw Cashfree transfer statuses that mean "accepted / in flight". */
const ACCEPTED_TRANSFER_STATUSES = new Set([
  'RECEIVED',
  'PENDING',
  'APPROVAL_PENDING',
  'ACKNOWLEDGED',
  'SUCCESS',
]);

/**
 * Cashfree Payouts v2 gateway — beneficiary registration (Phase 5). Uses static
 * header auth with credentials separate from the PG. Instantiated by
 * `PayoutGatewayFactory`.
 */
@Injectable()
export class CashfreePayoutGateway implements IPayoutGateway {
  private readonly logger = new Logger(CashfreePayoutGateway.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    // Read (not getOrThrow) so the app still boots without payout creds; the
    // request fails clearly only when a payout operation is actually invoked.
    this.clientId =
      configService.get<string>('CASH_FREE_PAYOUT_CLIENT_ID') ?? '';
    this.clientSecret =
      configService.get<string>('CASH_FREE_PAYOUT_SECRET') ?? '';
    this.baseUrl = getCashfreePayoutBaseUrl();
  }

  async registerBeneficiary(
    input: RegisterBeneficiaryInput,
  ): Promise<BeneficiaryResult> {
    this.ensureConfigured();

    const response = await fetch(`${this.baseUrl}/v2/beneficiary`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBeneficiaryBody(input)),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        beneficiary_id?: string;
        beneficiary_status?: string;
      };
      return {
        beneficiaryId: data.beneficiary_id ?? input.beneficiaryId,
        status: this.mapStatus(data.beneficiary_status),
      };
    }

    // Already registered (same id or same bank account) → re-link existing.
    if (response.status === HTTP_CONFLICT) {
      this.logger.warn(
        `Beneficiary ${input.beneficiaryId} already exists; re-linking`,
      );
      const existing = await this.getBeneficiary(input.beneficiaryId);
      if (existing) return existing;
    }

    const message = await this.extractError(response);
    this.logger.error(
      `registerBeneficiary failed (${response.status}): ${message}`,
    );
    throw new ServiceUnavailableException(
      `Cashfree beneficiary registration failed: ${message}`,
    );
  }

  async getBeneficiary(
    beneficiaryId: string,
  ): Promise<BeneficiaryResult | null> {
    this.ensureConfigured();

    const response = await fetch(
      `${this.baseUrl}/beneficiary/${encodeURIComponent(beneficiaryId)}`,
      { method: 'GET', headers: this.buildHeaders() },
    );

    if (response.status === HTTP_NOT_FOUND) return null;
    if (!response.ok) {
      const message = await this.extractError(response);
      throw new ServiceUnavailableException(
        `Cashfree getBeneficiary failed: ${message}`,
      );
    }

    const data = (await response.json()) as {
      beneficiary_id?: string;
      beneficiary_status?: string;
    };
    return {
      beneficiaryId: data.beneficiary_id ?? beneficiaryId,
      status: this.mapStatus(data.beneficiary_status),
    };
  }

  async createTransfer(input: CreateTransferInput): Promise<TransferResult> {
    this.ensureConfigured();

    const response = await fetch(`${this.baseUrl}/transfers`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        transfer_id: input.transferId,
        transfer_amount: input.amount,
        transfer_mode: input.mode,
        transfer_remarks: input.remarks ?? 'Stayly host payout',
        beneficiary_details: { beneficiary_id: input.beneficiaryId },
      }),
    });

    if (response.ok) {
      return this.parseTransfer(await response.json(), input.transferId);
    }

    // On a server error, never blindly re-create: confirm via GET first.
    if (response.status >= HTTP_SERVER_ERROR) {
      const existing = await this.getTransfer(input.transferId);
      if (existing) return existing;
      const message = await this.extractError(response);
      throw new ServiceUnavailableException(
        `Cashfree transfer failed (retryable): ${message}`,
      );
    }

    // 4XX (e.g. INVALID_BENE) — not retryable; surface as rejected.
    const data = (await response.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
    };
    this.logger.error(
      `createTransfer rejected (${response.status}): ${data.message ?? response.statusText}`,
    );
    return {
      transferId: input.transferId,
      cfTransferId: null,
      status: data.status ?? 'FAILED',
      accepted: false,
    };
  }

  async getTransfer(transferId: string): Promise<TransferResult | null> {
    this.ensureConfigured();

    const response = await fetch(
      `${this.baseUrl}/transfers/${encodeURIComponent(transferId)}`,
      { method: 'GET', headers: this.buildHeaders() },
    );

    if (response.status === HTTP_NOT_FOUND) return null;
    if (!response.ok) {
      const message = await this.extractError(response);
      throw new ServiceUnavailableException(
        `Cashfree getTransfer failed: ${message}`,
      );
    }
    return this.parseTransfer(await response.json(), transferId);
  }

  private parseTransfer(payload: unknown, fallbackId: string): TransferResult {
    const data = (payload ?? {}) as {
      transfer_id?: string;
      cf_transfer_id?: string | number;
      status?: string;
    };
    const status = (data.status ?? '').toUpperCase();
    return {
      transferId: data.transfer_id ?? fallbackId,
      cfTransferId: data.cf_transfer_id ? String(data.cf_transfer_id) : null,
      status,
      accepted: ACCEPTED_TRANSFER_STATUSES.has(status),
    };
  }

  /**
   * Verify the signature and parse the body in one step (mirrors the PG's
   * `webhookPayment`). The caller just checks `valid` and acts on `event`.
   */
  webhookPayout(
    rawBody: string,
    signature: string,
    timestamp: string,
  ): PayoutWebhookResult {
    if (!this.verifySignature(signature, rawBody, timestamp)) {
      this.logger.warn('Rejected payout webhook with invalid signature');
      return { valid: false, error: 'Invalid webhook signature' };
    }

    const event = this.parseWebhook(rawBody);
    if (!event) {
      return { valid: false, error: 'Unparseable webhook body' };
    }

    return { valid: true, event };
  }

  private verifySignature(
    signature: string,
    rawBody: string,
    timestamp: string,
  ): boolean {
    if (!this.clientSecret || !signature) return false;
    const expected = createHmac('sha256', this.clientSecret)
      .update(timestamp + rawBody)
      .digest('base64');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private parseWebhook(rawBody: string): PayoutWebhookEvent | null {
    let parsed: {
      type?: string;
      data?: {
        transfer_id?: string;
        status_code?: string;
        status_description?: string;
        transfer_utr?: string;
      };
    };
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return null;
    }

    const transferId = parsed.data?.transfer_id;
    const eventType = parsed.type ?? '';
    if (!transferId) return null;

    return {
      transferId,
      eventType,
      statusCode: parsed.data?.status_code ?? null,
      statusDescription: parsed.data?.status_description ?? null,
      transferUtr: parsed.data?.transfer_utr ?? null,
      outcome: this.mapWebhookOutcome(eventType),
    };
  }

  private mapWebhookOutcome(eventType: string): PayoutWebhookEvent['outcome'] {
    switch (eventType.toUpperCase()) {
      case 'TRANSFER_SUCCESS':
        return 'paid';
      case 'TRANSFER_FAILED':
      case 'TRANSFER_REVERSED':
      case 'TRANSFER_REJECTED':
        return 'failed';
      case 'TRANSFER_ACKNOWLEDGED':
        return 'processing';
      default:
        return 'ignored';
    }
  }

  private buildBeneficiaryBody(
    input: RegisterBeneficiaryInput,
  ): Record<string, unknown> {
    const instrument =
      input.accountType === EPayoutAccountType.UPI
        ? { vpa: input.upiId }
        : {
            bank_account_number: input.accountNumber,
            bank_ifsc: input.ifsc,
          };

    const body: Record<string, unknown> = {
      beneficiary_id: input.beneficiaryId,
      beneficiary_name: input.name,
      beneficiary_instrument_details: instrument,
    };

    if (input.email || input.phone) {
      body.beneficiary_contact_details = {
        beneficiary_email: input.email,
        beneficiary_phone: input.phone,
        beneficiary_country_code: '+91',
      };
    }
    return body;
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-version': PAYOUT_API_VERSION,
      'x-client-id': this.clientId,
      'x-client-secret': this.clientSecret,
    };
  }

  private mapStatus(raw?: string): EBeneficiaryStatus {
    switch (raw?.toUpperCase()) {
      case 'VERIFIED':
        return EBeneficiaryStatus.VERIFIED;
      case 'INVALID':
        return EBeneficiaryStatus.INVALID;
      case 'FAILED':
        return EBeneficiaryStatus.FAILED;
      case 'INITIATED':
      default:
        return EBeneficiaryStatus.INITIATED;
    }
  }

  private async extractError(response: Response): Promise<string> {
    try {
      const data = (await response.json()) as { message?: string };
      return data.message ?? response.statusText;
    } catch {
      return response.statusText;
    }
  }

  private ensureConfigured(): void {
    if (!this.clientId || !this.clientSecret) {
      throw new InternalServerErrorException(
        'Cashfree payout credentials are not configured',
      );
    }
  }
}
