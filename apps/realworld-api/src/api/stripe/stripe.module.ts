import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AppointmentEntity,
  StripeConnectAccountEntity,
  WithdrawalEntity,
  WalletEntity,
} from '@repo/postgresql-typeorm';
import { FeaturedModule } from '../featured/featured.module';
import { GuestBookingModule } from '../guest-booking/guest-booking.module';
import { MeetingRoomModule } from '../meeting-room/meeting-room.module';
import { PaymentModule } from '../payment/payment.module';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppointmentEntity,
      StripeConnectAccountEntity,
      WithdrawalEntity,
      WalletEntity,
    ]),
    FeaturedModule,
    PaymentModule,
    MeetingRoomModule,
    GuestBookingModule,
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
