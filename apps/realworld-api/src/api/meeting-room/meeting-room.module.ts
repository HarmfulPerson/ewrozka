import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AppointmentEntity,
  MeetingEventEntity,
  MeetingRoomEntity,
} from '@repo/postgresql-typeorm';
import { DailyCoService } from './daily-co.service';
import { MeetingRoomController } from './meeting-room.controller';
import { MeetingRoomService } from './meeting-room.service';
import { VideoGateway } from './video.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MeetingRoomEntity,
      MeetingEventEntity,
      AppointmentEntity,
    ]),
  ],
  controllers: [MeetingRoomController],
  providers: [MeetingRoomService, DailyCoService, VideoGateway],
  exports: [MeetingRoomService, DailyCoService],
})
export class MeetingRoomModule {}
