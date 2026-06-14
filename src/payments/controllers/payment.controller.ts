import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import {
  IPaymentService,
  PaymentGatewayType,
} from '../interfaces/payment.interface';
import { PayoutService } from '../services/payout.service';

@Controller({ path: 'payments', version: '1' })
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    @Inject('IPaymentService')
    private readonly paymentService: IPaymentService,
    private readonly payoutService: PayoutService,
  ) {}

  @Public()
  @Post('webhook/cashfree-payout')
  @HttpCode(HttpStatus.OK)
  async handleCashfreePayoutWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-timestamp') timestamp: string,
  ) {
    this.logger.log('Received Cashfree payout webhook');
    // Respond 200 fast; processing is idempotent and safe to retry.
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    try {
      await this.payoutService.handlePayoutWebhook(
        rawBody,
        signature ?? '',
        timestamp ?? '',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Webhook processing failed';
      this.logger.error(`Payout webhook error: ${message}`);
    }
    return { success: true };
  }

  @Public()
  @Post('webhook/cashfree')
  @HttpCode(HttpStatus.OK)
  async handleCashfreeWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-webhook-signature') signature: string,
    @Query('txn') transactionId?: string,
  ) {
    this.logger.log('Received Cashfree webhook');

    try {
      const result = await this.paymentService.handleWebhook(
        PaymentGatewayType.CASHFREE,
        payload,
        signature,
        transactionId,
      );

      if (result.success) {
        return {
          success: true,
          message: 'Webhook processed successfully',
          transactionId: result.transactionId,
        };
      }

      return {
        success: false,
        error: result.error,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Webhook processing failed';
      this.logger.error(`Cashfree webhook error: ${message}`);

      return {
        success: false,
        error: message,
      };
    }
  }

  @Public()
  @Post('webhook/razorpay')
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    this.logger.log('Received Razorpay webhook');

    try {
      const result = await this.paymentService.handleWebhook(
        PaymentGatewayType.RAZORPAY,
        payload,
        signature,
      );

      if (result.success) {
        return {
          success: true,
          message: 'Webhook processed successfully',
          transactionId: result.transactionId,
        };
      }

      return {
        success: false,
        error: result.error,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Webhook processing failed';
      this.logger.error(`Razorpay webhook error: ${message}`);

      return {
        success: false,
        error: message,
      };
    }
  }

  @Public()
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log('Received Stripe webhook');

    try {
      const result = await this.paymentService.handleWebhook(
        PaymentGatewayType.STRIPE,
        payload,
        signature,
      );

      if (result.success) {
        return {
          success: true,
          message: 'Webhook processed successfully',
          transactionId: result.transactionId,
        };
      }

      return {
        success: false,
        error: result.error,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Webhook processing failed';
      this.logger.error(`Stripe webhook error: ${message}`);

      return {
        success: false,
        error: message,
      };
    }
  }
}
