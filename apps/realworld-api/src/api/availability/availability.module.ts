import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  AppointmentEntity,
  AvailabilityEntity,
  GuestBookingEntity,
  MeetingRequestEntity,
} from '@repo/postgresql-typeorm';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityCronService } from './availability-cron.service';

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AvailabilityCronService],
  exports: [AvailabilityService],
  imports: [
    TypeOrmModule.forFeature([
      AvailabilityEntity,
      AdvertisementEntity,
      AppointmentEntity,
      GuestBookingEntity,
      MeetingRequestEntity,
    ]),
  ],
})
export class AvailabilityModule {}
