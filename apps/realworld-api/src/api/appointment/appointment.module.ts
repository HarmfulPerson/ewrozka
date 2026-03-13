import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AppointmentEntity,
  GuestBookingEntity,
  ReminderConfigEntity,
  ReminderLogEntity,
} from '@repo/postgresql-typeorm';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { AppointmentCronService } from './appointment-cron.service';
import { ReminderService } from './reminder.service';
import { EmailModule } from '../email/email.module';
import { MeetingRoomModule } from '../meeting-room/meeting-room.module';
import { PaymentModule } from '../payment/payment.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  controllers: [AppointmentController],
  providers: [AppointmentService, AppointmentCronService, ReminderService],
  imports: [
    TypeOrmModule.forFeature([
      AppointmentEntity,
      GuestBookingEntity,
      ReminderConfigEntity,
      ReminderLogEntity,
    ]),
    EmailModule,
    MeetingRoomModule,
    PaymentModule,
    StripeModule,
  ],
})
export class AppointmentModule {}
