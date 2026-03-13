import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AppointmentEntity,
  GuestBookingEntity,
} from '@repo/postgresql-typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { ReminderService } from './reminder.service';

@Injectable()
export class AppointmentCronService {
  private readonly logger = new Logger(AppointmentCronService.name);

  constructor(
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepository: Repository<AppointmentEntity>,
    @InjectRepository(GuestBookingEntity)
    private readonly guestBookingRepository: Repository<GuestBookingEntity>,
    private readonly emailService: EmailService,
    private readonly reminderService: ReminderService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async completeFinishedAppointments() {
    this.logger.log('Cron: sprawdzanie zakonczonych spotkan + przypomnienia...');
    const now = new Date();

    // ─── Appointments (zalogowani klienci) ─────────────────────────────────
    const paidAppointments = await this.appointmentRepository.find({
      where: { status: 'paid' },
      relations: ['client', 'wrozka', 'advertisement'],
    });

    const toComplete = paidAppointments.filter((apt) => {
      const endTime = new Date(apt.startsAt);
      endTime.setMinutes(endTime.getMinutes() + apt.durationMinutes);
      return endTime < now;
    });

    for (const appointment of toComplete) {
      appointment.status = 'completed';
      await this.appointmentRepository.save(appointment);

      // Email: zachęta do oceny (tylko zalogowany klient)
      const client = appointment.client;
      if (client?.email) {
        this.emailService
          .sendMeetingCompletedRate(
            client.email,
            client.username ?? client.email.split('@')[0],
            appointment.wrozka?.username ?? 'wróżka',
            appointment.advertisement?.title ?? 'Konsultacja',
          )
          .catch((err) =>
            this.logger.error(`Failed to send rate email to ${client.email}`, err),
          );
      }
    }

    if (toComplete.length > 0) {
      this.logger.log(`Zakonczono ${toComplete.length} spotkan (appointments)`);
    }

    // ─── Guest bookings (niezalogowani) ────────────────────────────────────
    const paidGuestBookings = await this.guestBookingRepository.find({
      where: { status: 'paid' },
      relations: ['wizard', 'advertisement'],
    });

    const toCompleteGuest = paidGuestBookings.filter((gb) => {
      const endTime = new Date(gb.scheduledAt);
      endTime.setMinutes(endTime.getMinutes() + gb.durationMinutes);
      return endTime < now;
    });

    for (const booking of toCompleteGuest) {
      booking.status = 'completed';
      await this.guestBookingRepository.save(booking);

      // Email: podziękowanie dla gościa
      this.emailService
        .sendMeetingCompletedGuest(
          booking.guestEmail,
          booking.guestName,
          booking.wizard?.username ?? 'wróżka',
        )
        .catch((err) =>
          this.logger.error(`Failed to send guest completed email to ${booking.guestEmail}`, err),
        );
    }

    if (toCompleteGuest.length > 0) {
      this.logger.log(`Zakonczono ${toCompleteGuest.length} rezerwacji gosci`);
    }

    if (toComplete.length === 0 && toCompleteGuest.length === 0) {
      this.logger.debug('Brak spotkan do zakonczenia');
    }

    // Przypomnienia o nadchodzących spotkaniach (48h, 24h, 1h)
    this.reminderService.sendReminders().catch((err) =>
      this.logger.error(`Reminder cron error: ${err instanceof Error ? err.message : String(err)}`),
    );
  }
}
