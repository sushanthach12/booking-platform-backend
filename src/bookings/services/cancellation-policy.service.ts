import { Injectable } from '@nestjs/common';
import { EPropertyCancellationPolicy } from '../../properties/enums/property.enum';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export interface CancellationResolution {
  /** Percentage of the refundable accommodation base to refund (0–100). */
  refundPercent: number;
}

/**
 * Resolves the guest refund percentage from the booking's snapshotted
 * cancellation policy and how far ahead of check-in the cancellation lands.
 * Pure (no I/O) — windows are a fixed code lookup, no per-property columns.
 *
 * | Policy   | Window before check-in | Refund % |
 * | -------- | ---------------------- | -------- |
 * | flexible | ≥ 24h                  | 100 else 0 |
 * | moderate | ≥ 5 days               | 100 · < 5d → 50 · after check-in → 0 |
 * | strict   | ≥ 7 days               | 50 else 0 |
 */
@Injectable()
export class CancellationPolicyService {
  resolve(
    policy: string | undefined,
    checkInDate: Date,
    now: Date,
  ): CancellationResolution {
    const msUntilCheckIn = checkInDate.getTime() - now.getTime();
    const hoursUntil = msUntilCheckIn / MS_PER_HOUR;
    const daysUntil = msUntilCheckIn / MS_PER_DAY;

    switch (policy) {
      case EPropertyCancellationPolicy.FLEXIBLE:
        return { refundPercent: hoursUntil >= 24 ? 100 : 0 };
      case EPropertyCancellationPolicy.MODERATE:
        if (daysUntil >= 5) return { refundPercent: 100 };
        if (msUntilCheckIn > 0) return { refundPercent: 50 };
        return { refundPercent: 0 };
      case EPropertyCancellationPolicy.STRICT:
        return { refundPercent: daysUntil >= 7 ? 50 : 0 };
      default:
        // Unknown/missing policy → no refund (fail safe; never over-refund).
        return { refundPercent: 0 };
    }
  }
}
