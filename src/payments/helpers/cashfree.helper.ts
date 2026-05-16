export const getCashFreeBaseUrl = () => {
  return 'https://sandbox.cashfree.com/pg';
};

export const getCashFreeNotifyUrl = (transactionId: string) => {
  const base = process.env.APP_URL ?? 'http://localhost:8000';
  return `${base}/api/v1/payments/webhook/cashfree?txn=${transactionId}`;
};
