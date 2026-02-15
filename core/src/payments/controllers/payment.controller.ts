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
import {
  IPaymentService,
  PaymentGatewayType,
} from '../interfaces/payment.interface';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    @Inject('IPaymentService')
    private readonly paymentService: IPaymentService,
  ) {}

  @Post('webhook/cashfree')
  @HttpCode(HttpStatus.OK)
  async handleCashfreeWebhook(
    @Body() payload: any,
    @Headers('x-cashfree-signature') signature: string,
  ) {
    this.logger.log('Received Cashfree webhook');

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
    } else {
      return {
        success: false,
        error: result.error,
      };
    }
  }

  @Post('webhook/razorpay')
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    this.logger.log('Received Razorpay webhook');

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
    } else {
      return {
        success: false,
        error: result.error,
      };
    }
  }

  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log('Received Stripe webhook');

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
    } else {
      return {
        success: false,
        error: result.error,
      };
    }
  }
}
