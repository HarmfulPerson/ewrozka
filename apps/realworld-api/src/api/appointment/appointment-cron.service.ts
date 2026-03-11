import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { AppointmentEntity } from '@repo/postgresql-typeorm';
import { LessThan, Repository } from 'typeorm';

@Injectable()
export class AppointmentCronService {
  private readonly logger = new Logger(AppointmentCronService.name);

  constructor(
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepository: Repository<AppointmentEntity>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async completeFinishedAppointments() {
    this.logger.debug('Running cron job to complete finished appointments...');

    const now = new Date();

    // Find all paid appointments where startsAt + durationMinutes < now
    const paidAppointments = await this.appointmentRepository.find({
      where: {
        status: 'paid',
      },
    });

    const toComplete = paidAppointments.filter((appointment) => {
      const endTime = new Date(appointment.startsAt);
      endTime.setMinutes(endTime.getMinutes() + appointment.durationMinutes);
      return endTime < now;
    });

    if (toComplete.length > 0) {
      for (const appointment of toComplete) {
        appointment.status = 'completed';
        await this.appointmentRepository.save(appointment);
      }
      this.logger.log(`Completed ${toComplete.length} finished appointments`);
    } else {
      this.logger.debug('No appointments to complete');
    }
  }
}
