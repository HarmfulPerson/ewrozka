import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  AppointmentEntity,
  MeetingRequestEntity,
  UserEntity,
} from '@repo/postgresql-typeorm';
import { AdvertisementController } from './advertisement.controller';
import { AdvertisementService } from './advertisement.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdvertisementEntity, UserEntity, AppointmentEntity, MeetingRequestEntity])],
  controllers: [AdvertisementController],
  providers: [AdvertisementService],
  exports: [AdvertisementService],
})
export class AdvertisementModule {}
