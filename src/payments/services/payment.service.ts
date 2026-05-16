import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { JOB_SYNC_PAYMENT_STATUS } from '../../bookings/booking-jobs/constants';
import { QUEUE_PAYMENT_STATUS_SYNC } from '../../queues/queues.module';
import { PaymentGatewayFactory } from '../factories/payment-gateway.factory';
import {
  IPaymentService,
  PaymentCustomerDetails,
  PaymentGatewayStatus,
  PaymentGatewayType,
  PaymentOptions,
  PaymentResponse,
  PaymentStatus,
  WebhookPaymentResult,
} from '../interfaces/payment.interface';
import { PaymentTransactionService } from './payment-transaction.service';

@Injectable()
export class PaymentService implements IPaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
    private readonly configService: ConfigService,
    private readonly paymentTransactionService: PaymentTransactionService,
    @InjectQueue(QUEUE_PAYMENT_STATUS_SYNC)
    private readonly paymentStatusSyncQueue: Queue,
  ) {}

  async createPayment(
    amount: number,
    currency: string,
    customerDetails: PaymentCustomerDetails,
    options?: PaymentOptions,
  ): Promise<PaymentResponse> {
    this.logger.log(`Creating payment for amount: ${amount} ${currency}`);

    // Generate unique transaction ID
    const transactionId = this.generateTransactionId();

    // Create payment transaction record
    await this.paymentTransactionService.create({
      id: transactionId,
      amount,
      currency,
      status: PaymentStatus.PENDING,
      bookingId: options?.bookingId,
      guestId: customerDetails.customerId,
      propertyId: options?.propertyId,
      gatewayType: this.configService.get<string>(
        'DEFAULT_PAYMENT_GATEWAY',
        PaymentGatewayType.CASHFREE,
      ) as PaymentGatewayType,
      metadata: options?.metadata,
    });

    try {
      // Get the appropriate payment gateway
      const gateway = this.paymentGatewayFactory.getDefaultGateway();

      // Create payment with gateway
      const paymentResponse = await gateway.createPayment(
        transactionId,
        amount,
        currency,
        customerDetails,
        options,
      );

      if (!paymentResponse.success) {
        // Update transaction status to failed
        await this.paymentTransactionService.updateStatus(
          transactionId,
          PaymentStatus.FAILED,
          paymentResponse.error,
        );
        throw new BadRequestException(
          `Payment creation failed: ${paymentResponse.error}`,
        );
      }

      // Update transaction with gateway response
      await this.paymentTransactionService.update(transactionId, {
        gatewayOrderId: paymentResponse.orderId,
        paymentLinkId: paymentResponse.paymentLinkId,
        paymentSessionId: paymentResponse.paymentSessionId,
        expiresAt: paymentResponse.expiresAt,
      });

      return {
        transactionId,
        paymentLink: paymentResponse.paymentLinkId,
        paymentSessionId: paymentResponse.paymentSessionId,
        success: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Payment creation failed: ${message}`);
      await this.paymentTransactionService.updateStatus(
        transactionId,
        PaymentStatus.FAILED,
        message,
      );
      throw error;
    }
  }

  async getPaymentId(transactionId: string): Promise<string | null> {
    this.logger.log(`Getting payment ID for transaction: ${transactionId}`);

    const transaction =
      await this.paymentTransactionService.findById(transactionId);

    return transaction?.gatewayOrderId ?? null;
  }

  async getPaymentLinkForTransaction(
    transactionId: string,
  ): Promise<{ paymentLink?: string; paymentSessionId?: string }> {
    const transaction =
      await this.paymentTransactionService.findById(transactionId);
    if (!transaction) {
      return {};
    }
    return {
      paymentLink: transaction.paymentLinkId,
      paymentSessionId: transaction.paymentSessionId,
    };
  }

  async getPaymentStatus(transactionId: string): Promise<{
    status: string;
    gatewayStatus?: string;
    paymentId?: string;
  }> {
    this.logger.log(`Getting payment status for transaction: ${transactionId}`);

    const transaction =
      await this.paymentTransactionService.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException(`Transaction not found: ${transactionId}`);
    }

    // If transaction is already in final state, return cached status
    if (
      [
        PaymentStatus.SUCCESS,
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
        PaymentStatus.REFUNDED,
        PaymentStatus.PARTIALLY_REFUNDED,
      ].includes(transaction.status as PaymentStatus)
    ) {
      return {
        status: transaction.status,
        gatewayStatus: transaction.gatewayStatus,
        paymentId: transaction.gatewayPaymentId,
      };
    }

    try {
      // Get fresh status from gateway
      const gateway = this.paymentGatewayFactory.createGateway(
        transaction.gatewayType as PaymentGatewayType,
      );
      const statusResponse = await gateway.getPaymentStatus(
        transaction.gatewayOrderId ?? '',
      );

      // Update transaction with latest status
      await this.paymentTransactionService.update(transactionId, {
        gatewayStatus: statusResponse.status,
        gatewayPaymentId: statusResponse.paymentId,
        status: this.mapGatewayStatusToTransactionStatus(statusResponse.status),
      });

      return {
        status: this.mapGatewayStatusToTransactionStatus(statusResponse.status),
        gatewayStatus: statusResponse.status,
        paymentId: statusResponse.paymentId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get payment status: ${message}`);
      return {
        status: transaction.status,
        gatewayStatus: transaction.gatewayStatus,
        paymentId: transaction.gatewayPaymentId,
      };
    }
  }

  async handleWebhook(
    gatewayType: PaymentGatewayType,
    payload: any,
    signature: string,
    transactionId?: string,
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    this.logger.log(`Handling webhook for gateway: ${gatewayType}`);

    try {
      const gateway = this.paymentGatewayFactory.createGateway(gatewayType);
      const result = await gateway.webhookPayment(payload, signature);

      if (!result.valid) {
        return {
          success: false,
          error: result.error || 'Webhook verification failed',
        };
      }

      const resolvedTransactionId = transactionId || result.transactionId;

      if (!resolvedTransactionId) {
        return {
          success: false,
          error: 'Transaction ID not found in webhook data',
        };
      }

      await this.processWebhookUpdate(resolvedTransactionId, result);

      return { success: true, transactionId: resolvedTransactionId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook handling failed: ${message}`);
      return { success: false, error: message };
    }
  }

  async terminatePayment(transactionId: string): Promise<boolean> {
    this.logger.log(`Terminating payment for transaction: ${transactionId}`);

    try {
      if (!transactionId) {
        this.logger.error(`Transaction ID not found: ${transactionId}`);
        return false;
      }

      const transaction =
        await this.paymentTransactionService.findById(transactionId);

      if (!transaction) {
        this.logger.error(`Transaction not found: ${transactionId}`);
        return false;
      }

      // Only allow termination of pending payments
      if (transaction.status !== PaymentStatus.PENDING) {
        this.logger.warn(
          `Cannot terminate transaction with status: ${transaction.status}`,
        );
        return false;
      }

      // Attempt gateway-level cancellation so the payment link is invalidated
      if (transaction.gatewayOrderId) {
        try {
          const gateway = this.paymentGatewayFactory.createGateway(
            transaction.gatewayType as PaymentGatewayType,
          );
          await gateway.terminatePayment(transaction.gatewayOrderId);
        } catch (gatewayErr) {
          // Log and continue — we still mark the transaction cancelled locally
          this.logger.warn(
            `Gateway cancellation failed for transaction ${transactionId}: ${gatewayErr instanceof Error ? gatewayErr.message : String(gatewayErr)}`,
          );
        }
      }

      // Update transaction status to cancelled
      await this.paymentTransactionService.updateStatus(
        transactionId,
        PaymentStatus.CANCELLED,
      );

      this.logger.log(`Payment terminated successfully for transaction`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to terminate payment: ${message}`);
      return false;
    }
  }

  private generateTransactionId(): string {
    // Generate unique transaction ID with prefix
    const prefix = 'txn';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  private mapGatewayStatusToTransactionStatus(gatewayStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: PaymentStatus.PENDING,
      success: PaymentStatus.SUCCESS,
      failed: PaymentStatus.FAILED,
      cancelled: PaymentStatus.CANCELLED,
      refunded: PaymentStatus.REFUNDED,
      partially_refunded: PaymentStatus.PARTIALLY_REFUNDED,
    };
    const key = String(gatewayStatus ?? '').toLowerCase();
    return statusMap[key] ?? PaymentStatus.PENDING;
  }

  private async processWebhookUpdate(
    transactionId: string,
    result: WebhookPaymentResult,
  ): Promise<void> {
    const transaction =
      await this.paymentTransactionService.findById(transactionId);

    if (!transaction) {
      this.logger.warn(
        `processWebhookUpdate: transaction not found ${transactionId}`,
      );
      return;
    }

    if (transaction.status !== PaymentStatus.PENDING) {
      this.logger.debug(
        `Skipping webhook update for ${transactionId} — already in state: ${transaction.status}`,
      );
      return;
    }

    const gatewayStatus = result.status ?? PaymentGatewayStatus.PENDING;
    const status = this.mapGatewayStatusToTransactionStatus(gatewayStatus);

    await this.paymentTransactionService.update(transactionId, {
      status,
      gatewayStatus: result.rawStatus ?? gatewayStatus,
      gatewayPaymentId: result.gatewayPaymentId,
      processedAt: new Date(),
      updatedAt: new Date(),
    });

    await this.paymentStatusSyncQueue.add(JOB_SYNC_PAYMENT_STATUS, {
      transactionId,
      status,
    });
  }
}
