import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BALANCE_SERVICE,
  PAYMENT_TRANSACTION_REPOSITORY,
  PAYOUT_ACCOUNT_REPOSITORY,
  PAYOUT_REPOSITORY,
  PLATFORM_COMMISSION,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
} from '../database';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { QueuesModule } from '../queues/queues.module';
import { PaymentController } from './controllers/payment.controller';
import { PayoutsController } from './controllers/payouts.controller';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { PayoutAccountEntity } from './entities/payout-account.entity';
import { PayoutEntity } from './entities/payout.entity';
import { WalletEntity } from './entities/wallet.entity';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';
import { PaymentGatewayFactory } from './factories/payment-gateway.factory';
import { PayoutGatewayFactory } from './factories/payout-gateway.factory';
import { PayoutEncryptionHelper } from './helpers/payout-encryption.helper';
import { BalanceReleaseProcessor } from './jobs/processors/balance-release.processor';
import { PayoutDispatchProcessor } from './jobs/processors/payout-dispatch.processor';
import { PaymentTransactionRepository } from './repositories/implementations/payment-transaction.repository';
import { PayoutAccountRepository } from './repositories/implementations/payout-account.repository';
import { PayoutRepository } from './repositories/implementations/payout.repository';
import { WalletRepository } from './repositories/implementations/wallet.repository';
import { WalletTransactionRepository } from './repositories/implementations/wallet-transaction.repository';
import { BalanceService } from './services/balance.service';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { PaymentService } from './services/payment.service';
import { PayoutAccountService } from './services/payout-account.service';
import { PayoutService } from './services/payout.service';
import { PayoutSettingsService } from './services/payout-settings.service';
import { PlatformCommissionService } from './services/platform-commission.service';

@Module({
  imports: [
    ConfigModule,
    QueuesModule,
    TypeOrmModule.forFeature([
      PaymentTransactionEntity,
      PayoutEntity,
      PayoutAccountEntity,
      WalletEntity,
      WalletTransactionEntity,
      // Read-only here, for the host-balance "upcoming earnings" projection.
      BookingEntity,
    ]),
  ],
  controllers: [PaymentController, PayoutsController],
  providers: [
    {
      provide: PAYMENT_TRANSACTION_REPOSITORY,
      useClass: PaymentTransactionRepository,
    },
    {
      provide: PAYOUT_REPOSITORY,
      useClass: PayoutRepository,
    },
    {
      provide: PAYOUT_ACCOUNT_REPOSITORY,
      useClass: PayoutAccountRepository,
    },
    {
      provide: PLATFORM_COMMISSION,
      useClass: PlatformCommissionService,
    },
    {
      provide: WALLET_REPOSITORY,
      useClass: WalletRepository,
    },
    {
      provide: WALLET_TRANSACTION_REPOSITORY,
      useClass: WalletTransactionRepository,
    },
    {
      provide: BALANCE_SERVICE,
      useClass: BalanceService,
    },
    PayoutGatewayFactory,
    PayoutSettingsService,
    BalanceReleaseProcessor,
    PayoutDispatchProcessor,
    PaymentTransactionService,
    PayoutService,
    PayoutAccountService,
    PayoutEncryptionHelper,
    {
      provide: 'IPaymentService',
      useClass: PaymentService,
    },
    PaymentGatewayFactory,
  ],
  exports: ['IPaymentService', PLATFORM_COMMISSION, BALANCE_SERVICE],
})
export class PaymentModule {}
