import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  WalletEntity,
  TransactionEntity,
  PlatformRevenueEntity,
} from '@repo/postgresql-typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletEntity,
      TransactionEntity,
      PlatformRevenueEntity,
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
