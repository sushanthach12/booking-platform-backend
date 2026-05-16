import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getCashFreeBaseUrl,
  getCashFreeNotifyUrl,
} from '../helpers/cashfree.helper';
import {
  GatewayPaymentResponse,
  GatewayStatusResponse,
  IPaymentGateway,
  PaymentCustomerDetails,
  PaymentGatewayStatus,
  PaymentOptions,
  RefundResponse,
  WebhookPaymentResult,
} from '../interfaces/payment.interface';

@Injectable()
export class CashfreeGateway implements IPaymentGateway {
  private readonly logger = new Logger(CashfreeGateway.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey =
      this.configService.getOrThrow<string>('CASH_FREE_APP_ID') || '';
    this.apiSecret =
      this.configService.getOrThrow<string>('CASH_FREE_SECRET_KEY') || '';
    this.baseUrl = getCashFreeBaseUrl();
  }

  async createPayment(
    transactionId: string,
    amount: number,
    currency: string,
    customerDetails: PaymentCustomerDetails,
    options?: PaymentOptions,
  ): Promise<GatewayPaymentResponse> {
    this.logger.log(
      `Creating Cashfree payment for transaction: ${transactionId}`,
    );

    const webhookURL = getCashFreeNotifyUrl(transactionId);

    try {
      const body = {
        order_id: transactionId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: customerDetails.customerId,
          customer_email: customerDetails.email,
          customer_name: customerDetails.name,
          customer_phone: customerDetails.phone || '9999999999',
        },
        order_meta: {
          return_url: options?.returnUrl ?? '',
          notify_url: webhookURL,
        },
        order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        order_tags: {
          transaction_id: transactionId,
        },
      };

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as {
        order_id?: string;
        cf_order_id?: string;
        payment_link?: string;
        payment_session_id?: string;
        order_expiry_time?: string;
        message?: string;
        code?: string;
      };

      if (!response.ok) {
        this.logger.error(
          `Cashfree createPayment error: ${data.message ?? response.statusText}`,
        );
        return {
          success: false,
          orderId: transactionId,
          error: data.message ?? 'Payment creation failed',
        };
      }

      return {
        success: true,
        orderId: data.order_id ?? transactionId,
        paymentLinkId: data.payment_link,
        paymentSessionId: data.payment_session_id,
        expiresAt: data.order_expiry_time
          ? new Date(data.order_expiry_time)
          : new Date(Date.now() + 30 * 60 * 1000),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create Cashfree payment: ${msg}`);
      return { success: false, orderId: transactionId, error: msg };
    }
  }

  async getPaymentStatus(orderId: string): Promise<GatewayStatusResponse> {
    this.logger.log(`Getting payment status for order: ${orderId}`);

    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: this.buildHeaders(),
      });

      const data = (await response.json()) as {
        order_id?: string;
        order_status?: string;
        order_amount?: number;
        order_currency?: string;
        cf_payment_id?: string;
        message?: string;
      };

      if (!response.ok) {
        this.logger.error(
          `Cashfree getPaymentStatus error: ${data.message ?? response.statusText}`,
        );
        return {
          orderId,
          status: PaymentGatewayStatus.FAILED,
          error: data.message ?? 'Status fetch failed',
        };
      }

      return {
        orderId,
        status: this.mapCashfreeStatus(data.order_status),
        amount: data.order_amount,
        currency: data.order_currency,
        paymentId: data.cf_payment_id?.toString(),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get payment status: ${msg}`);
      return { orderId, status: PaymentGatewayStatus.FAILED, error: msg };
    }
  }

  async webhookPayment(
    payload: unknown,
    _signature: string,
  ): Promise<WebhookPaymentResult> {
    this.logger.log('Processing Cashfree webhook');

    try {
      if (!payload) {
        return { valid: false, error: 'Missing payload' };
      }

      const data: Record<string, unknown> =
        typeof payload === 'string'
          ? JSON.parse(payload)
          : (payload as Record<string, unknown>);

      const eventData = data.data as Record<string, unknown> | undefined;
      const payment = eventData?.payment as Record<string, unknown> | undefined;
      const order = eventData?.order as Record<string, unknown> | undefined;
      const orderTags = order?.order_tags as
        | Record<string, unknown>
        | undefined;

      const rawStatus = (payment?.payment_status as string) ?? '';
      const gatewayStatus = this.mapCashfreeStatus(rawStatus);

      return {
        valid: true,
        transactionId:
          (orderTags?.transaction_id as string | undefined) ??
          (order?.order_id as string | undefined),
        gatewayPaymentId: payment?.cf_payment_id as string | undefined,
        status: gatewayStatus,
        rawStatus,
        amount: payment?.payment_amount as number | undefined,
        currency: payment?.payment_currency as string | undefined,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook processing failed: ${msg}`);
      return { valid: false, error: msg };
    }
  }

  async refundPayment(
    orderId: string,
    amount?: number,
  ): Promise<RefundResponse> {
    this.logger.log(
      `Processing refund for order: ${orderId}, amount: ${amount}`,
    );

    try {
      const refundId = `refund_${orderId}_${Date.now()}`;
      const body = {
        refund_amount: amount,
        refund_id: refundId,
        refund_note: 'Booking cancellation refund',
      };

      const response = await fetch(
        `${this.baseUrl}/orders/${orderId}/refunds`,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(body),
        },
      );

      const data = (await response.json()) as {
        cf_refund_id?: string;
        refund_id?: string;
        refund_amount?: number;
        refund_status?: string;
        message?: string;
      };

      if (!response.ok) {
        this.logger.error(
          `Cashfree refund error: ${data.message ?? response.statusText}`,
        );
        return {
          success: false,
          refundId: '',
          amount: amount ?? 0,
          status: 'failed',
          error: data.message ?? 'Refund failed',
        };
      }

      return {
        success: true,
        refundId: data.cf_refund_id ?? data.refund_id ?? refundId,
        amount: data.refund_amount ?? amount ?? 0,
        status: data.refund_status === 'SUCCESS' ? 'succeeded' : 'pending',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Refund failed: ${msg}`);
      return {
        success: false,
        refundId: '',
        amount: 0,
        status: 'failed',
        error: msg,
      };
    }
  }

  async terminatePayment(orderId: string): Promise<boolean> {
    this.logger.log(`Terminating payment for order: ${orderId}`);

    try {
      const response = await fetch(
        `${this.baseUrl}/orders/${orderId}/terminate`,
        {
          method: 'PATCH',
          headers: this.buildHeaders(),
          body: JSON.stringify({ order_status: 'TERMINATED' }),
        },
      );

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        this.logger.error(
          `Cashfree terminate error: ${data.message ?? response.statusText}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Payment termination failed: ${msg}`);
      return false;
    }
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-version': '2025-01-01',
      'x-client-id': this.apiKey,
      'x-client-secret': this.apiSecret,
    };
  }

  private mapCashfreeStatus(status?: string): PaymentGatewayStatus {
    switch (status?.toUpperCase()) {
      case 'PAID':
      case 'SUCCESS':
        return PaymentGatewayStatus.SUCCESS;
      case 'EXPIRED':
      case 'CANCELLED':
        return PaymentGatewayStatus.CANCELLED;
      case 'FAILED':
      case 'TERMINATED':
        return PaymentGatewayStatus.FAILED;
      case 'REFUNDED':
        return PaymentGatewayStatus.REFUNDED;
      case 'PARTIALLY_REFUNDED':
        return PaymentGatewayStatus.PARTIALLY_REFUNDED;
      default:
        return PaymentGatewayStatus.PENDING;
    }
  }
}
