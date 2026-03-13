import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { AllConfigType } from '@/config/config.type';
import {
  AppointmentEntity,
  GuestBookingEntity,
  ReminderConfigEntity,
  ReminderLogEntity,
} from '@repo/postgresql-typeorm';
import { Between, Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { MeetingRoomService } from '../meeting-room/meeting-room.service';
import { StripeService } from '../stripe/stripe.service';

const REMINDER_HOURS = [48, 24, 1] as const;

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(ReminderConfigEntity)
    private readonly configRepo: Repository<ReminderConfigEntity>,
    @InjectRepository(ReminderLogEntity)
    private readonly logRepo: Repository<ReminderLogEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepo: Repository<AppointmentEntity>,
    @InjectRepository(GuestBookingEntity)
    private readonly guestBookingRepo: Repository<GuestBookingEntity>,
    private readonly emailService: EmailService,
    private readonly meetingRoomService: MeetingRoomService,
    private readonly stripeService: StripeService,
    private readonly config: ConfigService<AllConfigType>,
  ) {}

  async sendReminders(): Promise<void> {
    const config = await this.configRepo.findOne({ where: { id: 1 } });
    if (!config) {
      this.logger.warn(
        'ReminderService: brak tabeli reminder_config lub pusty rekord – uruchom migrację AddReminderConfig1741200000000',
      );
      return;
    }

    const now = new Date();

    for (const hours of REMINDER_HOURS) {
      const enabled =
        hours === 48 ? config.enabled48h : hours === 24 ? config.enabled24h : config.enabled1h;
      if (!enabled) continue;

      // Przypomnienie Xh: wysyłamy gdy do spotkania jest mniej niż Xh (okno: teraz → teraz+Xh)
      const windowStart = now;
      const windowEnd = new Date(now.getTime() + hours * 60 * 60 * 1000);

      const hoursLabel =
        hours === 48 ? '48 godzin' : hours === 24 ? '24 godziny' : '1 godzinę';

      await this.sendAppointmentReminders(hours, windowStart, windowEnd, hoursLabel);
      await this.sendGuestBookingReminders(hours, windowStart, windowEnd, hoursLabel);
    }
  }

  private async sendAppointmentReminders(
    hoursBefore: number,
    windowStart: Date,
    windowEnd: Date,
    hoursLabel: string,
  ): Promise<void> {
    const appointments = await this.appointmentRepo.find({
      where: { startsAt: Between(windowStart, windowEnd) },
      relations: ['client', 'wrozka', 'advertisement'],
    });

    const appUrl = this.config.get('stripe.frontendUrl', { infer: true }) ?? 'http://localhost:4000';

    for (const apt of appointments) {
      if (apt.status !== 'accepted' && apt.status !== 'paid') continue;

      const alreadySent = await this.logRepo.findOne({
        where: {
          entityType: 'appointment',
          entityId: String(apt.id),
          hoursBefore,
        },
      });
      if (alreadySent) continue;

      const recipientName = apt.client?.username ?? apt.client?.email?.split('@')[0] ?? 'Użytkownik';
      const to = apt.client?.email;
      if (!to) continue;

      const wizardName = apt.wrozka?.username ?? 'wróżka';
      const adTitle = apt.advertisement?.title ?? 'Konsultacja';
      const scheduledAt = apt.startsAt.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });

      try {
        if (apt.status === 'paid') {
          const tokens = await this.meetingRoomService.getTokensByAppointmentIds([apt.id]);
          const token = tokens[apt.id];
          if (!token) {
            this.logger.warn(`Brak tokenu spotkania dla appointment ${apt.id}`);
            continue;
          }
          const meetingUrl = `${appUrl}/spotkanie/${token}`;
          await this.emailService.sendMeetingReminderPaid(
            to,
            recipientName,
            wizardName,
            adTitle,
            scheduledAt,
            apt.durationMinutes,
            meetingUrl,
            hoursLabel,
          );
        } else {
          const { url } = await this.stripeService.createCheckoutSession(
            apt.id,
            apt.clientId,
            to,
          );
          const priceFormatted = `${(apt.priceGrosze / 100).toFixed(2)} zł`;
          await this.emailService.sendMeetingReminderUnpaid(
            to,
            recipientName,
            wizardName,
            adTitle,
            scheduledAt,
            apt.durationMinutes,
            priceFormatted,
            url,
            hoursLabel,
            'Zaloguj się i opłać spotkanie – link jest ważny 24 godziny.',
          );
        }

        await this.logRepo.save(
          this.logRepo.create({
            entityType: 'appointment',
            entityId: String(apt.id),
            hoursBefore,
          }),
        );
        this.logger.log(`Reminder ${hoursBefore}h sent for appointment ${apt.id}`);
      } catch (err) {
        this.logger.error(
          `Failed to send reminder for appointment ${apt.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  private async sendGuestBookingReminders(
    hoursBefore: number,
    windowStart: Date,
    windowEnd: Date,
    hoursLabel: string,
  ): Promise<void> {
    const bookings = await this.guestBookingRepo.find({
      where: { scheduledAt: Between(windowStart, windowEnd) },
      relations: ['wizard', 'advertisement'],
    });

    const appUrl = this.config.get('stripe.frontendUrl', { infer: true }) ?? 'http://localhost:4000';

    for (const bk of bookings) {
      if (bk.status !== 'accepted' && bk.status !== 'paid') continue;

      const alreadySent = await this.logRepo.findOne({
        where: {
          entityType: 'guest_booking',
          entityId: bk.id,
          hoursBefore,
        },
      });
      if (alreadySent) continue;

      const recipientName = bk.guestName;
      const to = bk.guestEmail;

      const wizardName = bk.wizard?.username ?? 'wróżka';
      const adTitle = bk.advertisement?.title ?? 'Konsultacja';
      const scheduledAt = bk.scheduledAt.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });

      try {
        if (bk.status === 'paid' && bk.guestToken) {
          const meetingUrl = `${appUrl}/guest/spotkanie/${bk.guestToken}`;
          await this.emailService.sendMeetingReminderPaid(
            to,
            recipientName,
            wizardName,
            adTitle,
            scheduledAt,
            bk.durationMinutes,
            meetingUrl,
            hoursLabel,
          );
        } else {
          const paymentUrl = `${appUrl}/platnosc/gosc/${bk.id}`;
          const priceFormatted = `${(bk.priceGrosze / 100).toFixed(2)} zł`;
          await this.emailService.sendMeetingReminderUnpaid(
            to,
            recipientName,
            wizardName,
            adTitle,
            scheduledAt,
            bk.durationMinutes,
            priceFormatted,
            paymentUrl,
            hoursLabel,
            'Kliknij link i opłać rezerwację – płatność kartą, BLIK lub Przelewy24.',
          );
        }

        await this.logRepo.save(
          this.logRepo.create({
            entityType: 'guest_booking',
            entityId: bk.id,
            hoursBefore,
          }),
        );
        this.logger.log(`Reminder ${hoursBefore}h sent for guest booking ${bk.id}`);
      } catch (err) {
        this.logger.error(
          `Failed to send reminder for guest booking ${bk.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
