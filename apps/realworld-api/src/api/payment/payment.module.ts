import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  WalletEntity,
  TransactionEntity,
  PlatformRevenueEntity,
  UserEntity,
  PlatformFeeConfigEntity,
  PlatformFeeTierEntity,
} from '@repo/postgresql-typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { CommissionTierService } from './commission-tier.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletEntity,
      TransactionEntity,
      PlatformRevenueEntity,
      UserEntity,
      PlatformFeeConfigEntity,
      PlatformFeeTierEntity,
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, CommissionTierService],
  exports: [PaymentService, CommissionTierService],
})
export class PaymentModule {}
