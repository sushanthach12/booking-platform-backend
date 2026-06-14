/**
 * Platform revenue model. The single source of truth for how a booking's gross
 * amount is split between the platform's commission and the host's net earnings.
 *
 * Implementations are swappable behind the {@link PLATFORM_COMMISSION} DI token,
 * so the rate (or the entire strategy) can change without touching consumers
 * (pricing calculator, cancellation-fee crediting, etc.).
 */

/** Outcome of splitting a gross amount into platform revenue and host earnings. */
export interface CommissionSplit {
  /** Platform commission, GST-inclusive. Deducted from the host's earnings. */
  platformFee: number;
  /** What the host actually earns for this amount: `grossAmount − platformFee`. */
  hostNet: number;
  /** Commission rate applied, as a percentage (e.g. `10` for 10%). */
  commissionPercent: number;
}

export interface IPlatformCommission {
  /**
   * Split a gross amount (e.g. a booking's grand total, or a retained
   * cancellation fee) into the platform's commission and the host's net share.
   *
   * @param grossAmount Amount the commission is calculated on (commission base).
   */
  split(grossAmount: number): CommissionSplit;
}
