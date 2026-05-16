export const getCashFreeBaseUrl = () => {
  return 'https://sandbox.cashfree.com/pg';
};

export const getCashFreeNotifyUrl = (transactionId: string) => {
  // const base = process.env.APP_URL ?? 'http://localhost:8000';
  const base = 'https://w6nv1v9z-8000.inc1.devtunnels.ms';
  return `${base}/api/v1/payments/webhook/cashfree?txn=${transactionId}`;
};
