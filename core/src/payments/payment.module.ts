import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PAYMENT_TRANSACTION_REPOSITORY } from '../database';
import { PaymentController } from './controllers/payment.controller';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { PaymentGatewayFactory } from './factories/payment-gateway.factory';
import { PaymentTransactionRepository } from './repositories/implementations/payment-transaction.repository';
import { PaymentService } from './services/payment.service';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [
    ConfigModule,
    QueuesModule,
    TypeOrmModule.forFeature([PaymentTransactionEntity]),
  ],
  controllers: [PaymentController],
  providers: [
    {
      provide: PAYMENT_TRANSACTION_REPOSITORY,
      useClass: PaymentTransactionRepository,
    },
    PaymentTransactionService,
    {
      provide: 'IPaymentService',
      useClass: PaymentService,
    },
    PaymentGatewayFactory,
  ],
  exports: ['IPaymentService'],
})
export class PaymentModule {}
