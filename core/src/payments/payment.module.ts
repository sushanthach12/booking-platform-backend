import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './controllers/payment.controller';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { PaymentGatewayFactory } from './factories/payment-gateway.factory';
import { PaymentService } from './services/payment.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([PaymentTransactionEntity])],
  controllers: [PaymentController],
  providers: [
    {
      provide: 'IPaymentService',
      useClass: PaymentService,
    },
    PaymentGatewayFactory,
  ],
  exports: ['IPaymentService'],
})
export class PaymentModule {}
