import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PAYMENT_TRANSACTION_REPOSITORY, PAYOUT_REPOSITORY } from '../database';
import { QueuesModule } from '../queues/queues.module';
import { PaymentController } from './controllers/payment.controller';
import { PayoutsController } from './controllers/payouts.controller';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { PayoutEntity } from './entities/payout.entity';
import { PaymentGatewayFactory } from './factories/payment-gateway.factory';
import { PaymentTransactionRepository } from './repositories/implementations/payment-transaction.repository';
import { PayoutRepository } from './repositories/implementations/payout.repository';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { PaymentService } from './services/payment.service';
import { PayoutService } from './services/payout.service';

@Module({
  imports: [
    ConfigModule,
    QueuesModule,
    TypeOrmModule.forFeature([PaymentTransactionEntity, PayoutEntity]),
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
    PaymentTransactionService,
    PayoutService,
    {
      provide: 'IPaymentService',
      useClass: PaymentService,
    },
    PaymentGatewayFactory,
  ],
  exports: ['IPaymentService'],
})
export class PaymentModule {}
