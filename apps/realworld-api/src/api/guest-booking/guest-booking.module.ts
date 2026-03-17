import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  GuestBookingEntity,
  StripeConnectAccountEntity,
  UserEntity,
} from '@repo/postgresql-typeorm';
import { AvailabilityModule } from '../availability/availability.module';
import { EmailModule } from '../email/email.module';
import { MeetingRoomModule } from '../meeting-room/meeting-room.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payment/payment.module';
import { GuestBookingController } from './guest-booking.controller';
import { GuestBookingService } from './guest-booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GuestBookingEntity,
      AdvertisementEntity,
      UserEntity,
      StripeConnectAccountEntity,
    ]),
    AvailabilityModule,
    EmailModule,
    MeetingRoomModule,
    NotificationsModule,
    PaymentModule,
  ],
  controllers: [GuestBookingController],
  providers: [GuestBookingService],
  exports: [GuestBookingService],
})
export class GuestBookingModule {}
