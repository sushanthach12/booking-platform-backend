import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { PaymentGatewayType } from '../factories/payment-gateway.factory';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

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
