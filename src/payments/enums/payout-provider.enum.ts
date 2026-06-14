/**
 * Supported payout providers. Mirrors `PaymentGatewayType` on the PG side;
 * `PayoutGatewayFactory` resolves the concrete gateway from this.
 */
export enum EPayoutProvider {
  CASHFREE = 'cashfree',
}
