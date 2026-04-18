import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import {
  IPaymentService,
  PaymentGatewayType,
} from '../interfaces/payment.interface';

@Controller({ path: 'payments', version: '1' })
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    @Inject('IPaymentService')
    private readonly paymentService: IPaymentService,
  ) {}

  @Public()
  @Post('webhook/cashfree')
  @HttpCode(HttpStatus.OK)
  async handleCashfreeWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-cashfree-signature') signature: string,
  ) {
    this.logger.log('Received Cashfree webhook');

    try {
      const result = await this.paymentService.handleWebhook(
        PaymentGatewayType.CASHFREE,
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
