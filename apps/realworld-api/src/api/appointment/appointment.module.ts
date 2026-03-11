import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity } from '@repo/postgresql-typeorm';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { AppointmentCronService } from './appointment-cron.service';
import { MeetingRoomModule } from '../meeting-room/meeting-room.module';
import { PaymentModule } from '../payment/payment.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  controllers: [AppointmentController],
  providers: [AppointmentService, AppointmentCronService],
  imports: [
    TypeOrmModule.forFeature([AppointmentEntity]),
    MeetingRoomModule,
    PaymentModule,
    StripeModule,
  ],
})
export class AppointmentModule {}
