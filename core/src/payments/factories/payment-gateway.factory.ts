import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPaymentGateway } from '../interfaces/payment-gateway.interface';
import { CashfreeGateway } from '../gateways/cashfree.gateway';

export enum PaymentGatewayType {
  CASHFREE = 'cashfree',
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
}

@Injectable()
export class PaymentGatewayFactory {
  private readonly logger = new Logger(PaymentGatewayFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cashfreeGateway: CashfreeGateway,
  ) {}

  createGateway(gatewayType: PaymentGatewayType): IPaymentGateway {
    this.logger.log(`Creating payment gateway: ${gatewayType}`);

    switch (gatewayType) {
      case PaymentGatewayType.CASHFREE:
        return this.cashfreeGateway;
      
      case PaymentGatewayType.RAZORPAY:
        // TODO: Implement Razorpay gateway
        throw new Error('Razorpay gateway not implemented yet');
      
      case PaymentGatewayType.STRIPE:
        // TODO: Implement Stripe gateway
        throw new Error('Stripe gateway not implemented yet');
      
      default:
        throw new Error(`Unsupported payment gateway: ${gatewayType}`);
    }
  }

  getDefaultGateway(): IPaymentGateway {
    const defaultGatewayType = this.configService.get<string>(
      'DEFAULT_PAYMENT_GATEWAY',
      PaymentGatewayType.CASHFREE,
    ) as PaymentGatewayType;

    return this.createGateway(defaultGatewayType);
  }

  getAvailableGateways(): PaymentGatewayType[] {
    return [
      PaymentGatewayType.CASHFREE,
      // Add other gateways as they are implemented
    ];
  }

  isGatewayAvailable(gatewayType: PaymentGatewayType): boolean {
    return this.getAvailableGateways().includes(gatewayType);
  }
}
