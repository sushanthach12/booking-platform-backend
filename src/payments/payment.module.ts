import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PAYOUT_REPOSITORY, PAYMENT_TRANSACTION_REPOSITORY } from '../database';
import { PaymentController } from './controllers/payment.controller';
import { PayoutsController } from './controllers/payouts.controller';
import { PayoutEntity } from './entities/payout.entity';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { PaymentGatewayFactory } from './factories/payment-gateway.factory';
import { PayoutRepository } from './repositories/payout.repository';
import { PaymentTransactionRepository } from './repositories/implementations/payment-transaction.repository';
import { PaymentService } from './services/payment.service';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { PayoutService } from './services/payout.service';
import { QueuesModule } from '../queues/queues.module';

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
