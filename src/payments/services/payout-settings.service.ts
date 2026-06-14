import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Minimum payable balance before a host may trigger a payout. */
const MIN_PAYOUT_THRESHOLD_ENV = 'MIN_PAYOUT_THRESHOLD';
/** Amount held back (not withdrawable) to absorb fees / refund clawbacks. */
const PAYOUT_RESERVE_AMOUNT_ENV = 'PAYOUT_RESERVE_AMOUNT';

/**
 * Platform-wide payout policy values, read once from config. Single source of
 * truth for the payout threshold and the retained reserve so the balance,
 * payout-request, and crediting paths all agree. Both default to 0.
 */
@Injectable()
export class PayoutSettingsService {
  private readonly minPayoutThreshold: number;
  private readonly reserveAmount: number;

  constructor(configService: ConfigService) {
    this.minPayoutThreshold = this.readAmount(
      configService,
      MIN_PAYOUT_THRESHOLD_ENV,
    );
    this.reserveAmount = this.readAmount(
      configService,
      PAYOUT_RESERVE_AMOUNT_ENV,
    );
  }

  getMinPayoutThreshold(): number {
    return this.minPayoutThreshold;
  }

  getReserveAmount(): number {
    return this.reserveAmount;
  }

  /** Parses a non-negative money amount from config; falls back to 0. */
  private readAmount(configService: ConfigService, key: string): number {
    const raw = configService.get<string>(key);
    const parsed = Number(raw);
    if (raw === undefined || raw === '' || Number.isNaN(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  }
}
