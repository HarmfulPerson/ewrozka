import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  AppointmentEntity,
  AvailabilityEntity,
  FeaturedWizardEntity,
  RoleEntity,
  TopicEntity,
  TransactionEntity,
  UserEntity,
  WizardApplicationEntity,
} from '@repo/postgresql-typeorm';
import { FeaturedModule } from '../featured/featured.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WizardApplicationEntity,
      UserEntity,
      RoleEntity,
      TopicEntity,
      AppointmentEntity,
      TransactionEntity,
      AvailabilityEntity,
      AdvertisementEntity,
      FeaturedWizardEntity,
    ]),
    FeaturedModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
