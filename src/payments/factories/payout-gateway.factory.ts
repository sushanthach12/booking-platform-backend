import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EPayoutProvider } from '../enums/payout-provider.enum';
import { CashfreePayoutGateway } from '../gateways/cashfree-payout.gateway';
import type { IPayoutGateway } from '../interfaces/payout-gateway.interface';

/**
 * Selects the concrete payout gateway at runtime. Mirrors
 * `PaymentGatewayFactory` on the PG side — add a provider by implementing
 * `IPayoutGateway` and registering it in the switch below.
 */
@Injectable()
export class PayoutGatewayFactory {
  private readonly logger = new Logger(PayoutGatewayFactory.name);

  constructor(private readonly configService: ConfigService) {}

  createGateway(provider: EPayoutProvider): IPayoutGateway {
    this.logger.log(`Creating payout gateway: ${provider}`);

    switch (provider) {
      case EPayoutProvider.CASHFREE:
        return new CashfreePayoutGateway(this.configService);

      default:
        throw new BadRequestException('Unsupported payout provider');
    }
  }

  getDefaultGateway(): IPayoutGateway {
    const provider = this.configService.get<string>(
      'DEFAULT_PAYOUT_PROVIDER',
      EPayoutProvider.CASHFREE,
    ) as EPayoutProvider;

    return this.createGateway(provider);
  }

  getAvailableProviders(): EPayoutProvider[] {
    return [
      EPayoutProvider.CASHFREE,
      // Add other providers as they are implemented
    ];
  }

  isProviderAvailable(provider: EPayoutProvider): boolean {
    return this.getAvailableProviders().includes(provider);
  }
}
