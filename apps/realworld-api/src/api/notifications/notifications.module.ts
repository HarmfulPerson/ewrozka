import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  GuestBookingEntity,
  MeetingRequestEntity,
  UserEntity,
} from '@repo/postgresql-typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingRequestEntity, GuestBookingEntity, AdvertisementEntity, UserEntity]),
    AuthModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}
