export const getCashFreeBaseUrl = () => {
  return 'https://sandbox.cashfree.com/pg';
};

export const getCashFreeNotifyUrl = (transactionId: string) => {
  const base = process.env.APP_URL ?? null;
  if (!base) {
    throw new Error('APP_URL environment variable is not set');
  }
  return `${base}/api/v1/payments/webhook/cashfree?txn=${transactionId}`;
};

/**
 * Cashfree Payouts v2 base URL. Separate product/credentials from the PG.
 * Driven by `CASHFREE_PAYOUT_ENV` ('production' | anything else → sandbox).
 */
export const getCashfreePayoutBaseUrl = () => {
  const env = (process.env.CASHFREE_PAYOUT_ENV ?? 'sandbox').toLowerCase();
  return env === 'production'
    ? 'https://api.cashfree.com/payout'
    : 'https://sandbox.cashfree.com/payout';
};
