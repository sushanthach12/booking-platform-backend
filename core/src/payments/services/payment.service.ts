import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PAYMENT_STATUS_UPDATED,
  PaymentStatusUpdatedPayload,
} from '../../common/events/payment.events';
import {
  IPaymentService,
  PaymentGatewayType,
  PaymentOptions,
  PaymentCustomerDetails,
  PaymentResponse,
  PaymentStatus,
} from '../interfaces/payment.interface';
import { PaymentTransactionEntity } from '../entities/payment-transaction.entity';
import { PaymentGatewayFactory } from '../factories/payment-gateway.factory';

@Injectable()
export class PaymentService implements IPaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(PaymentTransactionEntity)
    private readonly paymentTransactionRepository: Repository<PaymentTransactionEntity>,
  ) {}

  async createPayment(
    amount: number,
    currency: string,
    customerDetails: PaymentCustomerDetails,
    options?: PaymentOptions,
  ): Promise<PaymentResponse> {
    this.logger.log(`Creating payment for amount: ${amount} ${currency}`);

    // Generate unique transaction ID
    const transactionId = await this.generateTransactionId();
    
    // Create payment transaction record
    const paymentTransaction = this.paymentTransactionRepository.create({
      id: transactionId,
      amount,
      currency,
      status: 'PENDING',
      bookingId: options?.bookingId,
      guestId: customerDetails.customerId,
      propertyId: options?.propertyId,
      gatewayType: this.configService.get<string>('DEFAULT_PAYMENT_GATEWAY', PaymentGatewayType.CASHFREE) as PaymentGatewayType,
      metadata: options?.metadata,
    });

    await this.paymentTransactionRepository.save(paymentTransaction);

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
        await this.updateTransactionStatus(transactionId, 'FAILED', paymentResponse.error);
        throw new Error(`Payment creation failed: ${paymentResponse.error}`);
      }

      // Update transaction with gateway response
      await this.paymentTransactionRepository.update(transactionId, {
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
      this.logger.error(`Payment creation failed: ${error.message}`);
      await this.updateTransactionStatus(transactionId, 'FAILED', error.message);
      throw error;
    }
  }

  async getPaymentId(transactionId: string): Promise<string | null> {
    this.logger.log(`Getting payment ID for transaction: ${transactionId}`);
    
    const transaction = await this.paymentTransactionRepository.findOne({
      where: { id: transactionId },
    });

    return transaction?.gatewayOrderId || null;
  }

  async getPaymentStatus(transactionId: string): Promise<{
    status: string;
    gatewayStatus?: string;
    paymentId?: string;
  }> {
    this.logger.log(`Getting payment status for transaction: ${transactionId}`);
    
    const transaction = await this.paymentTransactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    // If transaction is already in final state, return cached status
    if (['SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(transaction.status)) {
      return {
        status: transaction.status,
        gatewayStatus: transaction.gatewayStatus,
        paymentId: transaction.gatewayPaymentId,
      };
    }

    try {
      // Get fresh status from gateway
      const gateway = this.paymentGatewayFactory.createGateway(transaction.gatewayType);
      const statusResponse = await gateway.getPaymentStatus(transaction.gatewayOrderId!);

      // Update transaction with latest status
      await this.paymentTransactionRepository.update(transactionId, {
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
      this.logger.error(`Failed to get payment status: ${error.message}`);
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
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    this.logger.log(`Handling webhook for gateway: ${gatewayType}`);

    try {
      const gateway = this.paymentGatewayFactory.createGateway(gatewayType);
      const verificationResult = await gateway.verifyWebhook(payload, signature);

      if (!verificationResult.valid) {
        return {
          success: false,
          error: verificationResult.error || 'Webhook verification failed',
        };
      }

      const webhookData = verificationResult.webhookData;
      const transactionId = webhookData?.orderId || webhookData?.transactionId;

      if (!transactionId) {
        return {
          success: false,
          error: 'Transaction ID not found in webhook data',
        };
      }

      // Update transaction based on webhook data
      await this.processWebhookUpdate(transactionId, webhookData);

      return {
        success: true,
        transactionId,
      };
    } catch (error) {
      this.logger.error(`Webhook handling failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async terminatePayment(transactionId: string): Promise<boolean> {
    this.logger.log(`Terminating payment for transaction: ${transactionId}`);
    
    try {

      if (!transactionId) {
        this.logger.error(`Transaction ID not found: ${transactionId}`);
        return false;
      }  

      const transaction = await this.paymentTransactionRepository.findOne({
        where: { id: transactionId },
        select: {id: true, status: true}
      });

      if (!transaction) {
        this.logger.error(`Transaction not found: ${transactionId}`);
        return false;
      }

      // Only allow termination of pending payments
      if (transaction.status !== PaymentStatus.PENDING) {
        this.logger.warn(`Cannot terminate transaction with status: ${transaction.status}`);
        return false;
      }

      // Update transaction status to cancelled
      await this.updateTransactionStatus(transactionId, PaymentStatus.CANCELLED);

      // TODO: Call gateway to cancel payment if needed
      // const gateway = this.paymentGatewayFactory.createGateway(transaction.gatewayType);
      // await gateway.cancelPayment(transaction.gatewayOrderId!);

      this.logger.log(`Payment terminated successfully for transaction`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to terminate payment: ${error.message}`);
      return false;
    }
  }

  private async generateTransactionId(): Promise<string> {
    // Generate unique transaction ID with prefix
    const prefix = 'txn';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  private async updateTransactionStatus(
    transactionId: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.paymentTransactionRepository.update(transactionId, {
      status,
      errorMessage,
      updatedAt: new Date(),
    });
  }

  private mapGatewayStatusToTransactionStatus(gatewayStatus: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'PENDING',
      'SUCCESS': 'SUCCESS',
      'FAILED': 'FAILED',
      'CANCELLED': 'CANCELLED',
      'REFUNDED': 'REFUNDED',
      'PARTIALLY_REFUNDED': 'PARTIALLY_REFUNDED',
    };

    return statusMap[gatewayStatus] || 'PENDING';
  }

  private async processWebhookUpdate(
    transactionId: string,
    webhookData: any,
  ): Promise<void> {
    const status = this.mapGatewayStatusToTransactionStatus(webhookData.status);

    await this.paymentTransactionRepository.update(transactionId, {
      status,
      gatewayStatus: webhookData.status,
      gatewayPaymentId: webhookData.paymentId,
      webhookData: webhookData,
      updatedAt: new Date(),
    });

    const payload: PaymentStatusUpdatedPayload = { transactionId, status };
    this.eventEmitter.emit(PAYMENT_STATUS_UPDATED, payload);
  }
}
