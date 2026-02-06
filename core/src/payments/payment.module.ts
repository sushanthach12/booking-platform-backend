import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './controllers/payment.controller';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { CashfreeGateway } from './gateways/cashfree.gateway';
import { PaymentGatewayFactory } from './factories/payment-gateway.factory';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([PaymentTransactionEntity]),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    CashfreeGateway,
    PaymentGatewayFactory,
  ],
  exports: [PaymentService, PaymentGatewayFactory],
})
export class PaymentModule {}
