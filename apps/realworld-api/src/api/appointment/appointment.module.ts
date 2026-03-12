import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AppointmentEntity,
  GuestBookingEntity,
} from '@repo/postgresql-typeorm';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { AppointmentCronService } from './appointment-cron.service';
import { EmailModule } from '../email/email.module';
import { MeetingRoomModule } from '../meeting-room/meeting-room.module';
import { PaymentModule } from '../payment/payment.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  controllers: [AppointmentController],
  providers: [AppointmentService, AppointmentCronService],
  imports: [
    TypeOrmModule.forFeature([AppointmentEntity, GuestBookingEntity]),
    EmailModule,
    MeetingRoomModule,
    PaymentModule,
    StripeModule,
  ],
})
export class AppointmentModule {}
