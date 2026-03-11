import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  GuestBookingEntity,
  UserEntity,
} from '@repo/postgresql-typeorm';
import { EmailModule } from '../email/email.module';
import { MeetingRoomModule } from '../meeting-room/meeting-room.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GuestBookingController } from './guest-booking.controller';
import { GuestBookingService } from './guest-booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GuestBookingEntity,
      AdvertisementEntity,
      UserEntity,
    ]),
    EmailModule,
    MeetingRoomModule,
    NotificationsModule,
  ],
  controllers: [GuestBookingController],
  providers: [GuestBookingService],
  exports: [GuestBookingService],
})
export class GuestBookingModule {}
