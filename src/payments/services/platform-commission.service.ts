import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CommissionSplit,
  IPlatformCommission,
} from '../interfaces/platform-commission.interface';

/** Host-side commission rate (percentage of grand total). Defaults to 0. */
const COMMISSION_PERCENT_ENV = 'PLATFORM_COMMISSION_PERCENT';
const DEFAULT_COMMISSION_PERCENT = 0;
const MIN_PERCENT = 0;
const MAX_PERCENT = 100;

/**
 * Default platform commission strategy: a host-side commission taken as a flat
 * percentage of the booking's grand total, GST-inclusive (no separate GST line).
 *
 * The rate is config-driven (`PLATFORM_COMMISSION_PERCENT`) and defaults to `0`,
 * so today the host receives the full amount and no deduction is made. Setting
 * the env var to a positive number is the only change needed to switch the
 * platform's cut on — every downstream `platformFee` / `hostNet` updates from
 * this one place. Swap the bound implementation to change the model entirely.
 */
@Injectable()
export class PlatformCommissionService implements IPlatformCommission {
  private readonly logger = new Logger(PlatformCommissionService.name);
  private readonly commissionPercent: number;

  constructor(private readonly configService: ConfigService) {
    this.commissionPercent = this.resolveCommissionPercent();
  }

  split(grossAmount: number): CommissionSplit {
    const gross = this.round2(Math.max(0, grossAmount));
    const platformFee = this.round2(gross * (this.commissionPercent / 100));
    const hostNet = this.round2(gross - platformFee);
    return {
      platformFee,
      hostNet,
      commissionPercent: this.commissionPercent,
    };
  }

  /** Reads + validates the configured rate once at construction. */
  private resolveCommissionPercent(): number {
    const raw = this.configService.get<string>(COMMISSION_PERCENT_ENV);
    const parsed = Number(raw);
    if (raw === undefined || raw === '' || Number.isNaN(parsed)) {
      return DEFAULT_COMMISSION_PERCENT;
    }
    // Clamp so a misconfiguration can never over-charge a host.
    const clamped = Math.min(Math.max(parsed, MIN_PERCENT), MAX_PERCENT);
    if (clamped !== parsed) {
      this.logger.warn(
        `${COMMISSION_PERCENT_ENV}=${raw} is out of range; clamped to ${clamped}%`,
      );
    }
    return clamped;
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
