import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  AppointmentEntity,
  MeetingRequestEntity,
  MeetingRoomEntity,
} from '@repo/postgresql-typeorm';
import { AvailabilityModule } from '../availability/availability.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MeetingRequestController } from './meeting-request.controller';
import { MeetingRequestService } from './meeting-request.service';

@Module({
  controllers: [MeetingRequestController],
  providers: [MeetingRequestService],
  imports: [
    TypeOrmModule.forFeature([
      MeetingRequestEntity,
      AdvertisementEntity,
      AppointmentEntity,
      MeetingRoomEntity,
    ]),
    AvailabilityModule,
    NotificationsModule,
  ],
})
export class MeetingRequestModule {}
