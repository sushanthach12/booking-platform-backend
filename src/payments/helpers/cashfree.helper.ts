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
