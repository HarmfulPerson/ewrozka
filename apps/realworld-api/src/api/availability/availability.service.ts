import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AllConfigType } from '@/config/config.type';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  AppointmentEntity,
  AvailabilityEntity,
  GuestBookingEntity,
  MeetingRequestEntity,
} from '@repo/postgresql-typeorm';
import { In, LessThan, MoreThan, Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { EmailType } from '../email/email-type.enum';
export interface SlotDto {
  startsAt: string;
  endsAt: string;
  date: string;
  startTime: string;
}

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    @InjectRepository(AvailabilityEntity)
    private readonly availabilityRepository: Repository<AvailabilityEntity>,
    @InjectRepository(AdvertisementEntity)
    private readonly advertisementRepository: Repository<AdvertisementEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepository: Repository<AppointmentEntity>,
    @InjectRepository(MeetingRequestEntity)
    private readonly meetingRequestRepository: Repository<MeetingRequestEntity>,
    @InjectRepository(GuestBookingEntity)
    private readonly guestBookingRepository: Repository<GuestBookingEntity>,
    private readonly emailService: EmailService,
    private readonly config: ConfigService<AllConfigType>,
  ) {}

  async addBlock(
    userId: number,
    startsAt: Date,
    endsAt: Date,
  ): Promise<{ id: number; startsAt: Date; endsAt: Date }> {
    const now = new Date();
    if (startsAt < now) {
      throw new BadRequestException('Nie można dodać bloku dostępności w przeszłości.');
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException('Godzina zakończenia musi być po godzinie rozpoczęcia.');
    }
    const minDurationMs = 30 * 60 * 1000;
    if (endsAt.getTime() - startsAt.getTime() < minDurationMs) {
      throw new BadRequestException('Minimalny blok dostępności to 30 minut.');
    }
    const existing = await this.availabilityRepository.find({ where: { userId } });
    for (const b of existing) {
      if (b.startsAt < endsAt && b.endsAt > startsAt) {
        throw new BadRequestException(
          'Ten blok nakłada się na inną dostępność. Wybierz inny termin.',
        );
      }
    }
    const entity = this.availabilityRepository.create({
      userId,
      startsAt,
      endsAt,
    });
    const saved = await this.availabilityRepository.save(entity);
    return { id: saved.id, startsAt: saved.startsAt, endsAt: saved.endsAt };
  }

  async getMyBlocks(
    userId: number,
    options?: { filter?: string; limit?: number; offset?: number; sortOrder?: 'ASC' | 'DESC' },
  ): Promise<{ availabilities: { id: number; startsAt: string; endsAt: string }[]; total: number }> {
    const queryBuilder = this.availabilityRepository
      .createQueryBuilder('availability')
      .where('availability.userId = :userId', { userId });

    const now = new Date();
    if (options?.filter === 'upcoming') {
      queryBuilder.andWhere('availability.endsAt >= :now', { now });
    } else if (options?.filter === 'past') {
      queryBuilder.andWhere('availability.endsAt < :now', { now });
    }

    const order = options?.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy('availability.startsAt', order);
    queryBuilder.take(options?.limit ?? 10);
    queryBuilder.skip(options?.offset ?? 0);

    const [blocks, total] = await queryBuilder.getManyAndCount();

    return {
      availabilities: blocks.map((b) => ({
        id: b.id,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
      })),
      total,
    };
  }

  async deleteBlock(userId: number, blockId: number): Promise<void> {
    const block = await this.availabilityRepository.findOne({
      where: { id: blockId, userId },
    });
    if (!block) {
      throw new NotFoundException('Blok nie istnieje lub nie należy do Ciebie.');
    }

    // Blokuj usunięcie jeśli w oknie tego bloku istnieje aktywne spotkanie (confirmed)
    const activeAppointment = await this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.wrozkaId = :userId', { userId })
      .andWhere('a.startsAt >= :start', { start: block.startsAt })
      .andWhere('a.startsAt < :end', { end: block.endsAt })
      .andWhere('a.status IN (:...statuses)', { statuses: ['accepted', 'paid'] })
      .getOne();

    if (activeAppointment) {
      throw new BadRequestException(
        'Nie możesz usunąć tego bloku dostępności, ponieważ istnieje aktywne spotkanie w tym terminie. Poczekaj na jego zakończenie lub anuluj je ręcznie.',
      );
    }

    const appUrl = this.config.get('stripe.frontendUrl', { infer: true }) ?? 'http://localhost:4000';
    const ads = await this.advertisementRepository.find({
      where: { userId },
      relations: ['user'],
    });
    const adIds = ads.map((a) => a.id);
    const wizard = ads[0]?.user;

    // Rezerwacje gości – anuluj, wyślij email (link do płatności przestanie działać po status=rejected)
    const guestBookingsInBlock = await this.guestBookingRepository.find({
      where: { wizardId: userId },
      relations: ['wizard', 'advertisement'],
    });
    const toCancelGuest = guestBookingsInBlock.filter((gb) => {
      const start = gb.scheduledAt.getTime();
      const end = start + gb.durationMinutes * 60 * 1000;
      const blockStart = block.startsAt.getTime();
      const blockEnd = block.endsAt.getTime();
      return start < blockEnd && end > blockStart && ['pending', 'accepted', 'paid'].includes(gb.status);
    });

    for (const gb of toCancelGuest) {
        gb.status = 'rejected';
        gb.rejectionReason = 'Termin został odwołany przez wróżkę.';
        await this.guestBookingRepository.save(gb);
        const scheduledPl = gb.scheduledAt.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
        this.emailService
          .send({
            to: gb.guestEmail,
            subject: 'Termin spotkania został odwołany – eWróżka',
            type: EmailType.GUEST_BOOKING_CANCELLED_BY_BLOCK,
            context: {
              guestName: gb.guestName,
              wizardName: gb.wizard?.username ?? wizard?.username ?? 'wróżka',
              scheduledAt: scheduledPl,
              appUrl,
            },
          })
          .catch((err) =>
            this.logger.error(`Failed to send guest cancellation email to ${gb.guestEmail}: ${err instanceof Error ? err.message : String(err)}`),
          );
      this.logger.log(`Guest booking ${gb.id} cancelled due to block removal`);
    }

    // Wnioski o spotkanie (zalogowani) – odrzuć, anuluj ewentualny appointment, wyślij email
    if (adIds.length > 0) {
      const requestsInBlock = await this.meetingRequestRepository.find({
        where: { advertisementId: In(adIds) },
        relations: ['user', 'advertisement', 'advertisement.user'],
      });
      const toRejectRequests = requestsInBlock.filter((r) => {
        if (!r.requestedStartsAt || !['pending', 'accepted'].includes(r.status)) return false;
        const start = r.requestedStartsAt.getTime();
        const ad = r.advertisement;
        const durationMs = (ad as { durationMinutes?: number })?.durationMinutes
          ? (ad as { durationMinutes: number }).durationMinutes * 60 * 1000
          : 60 * 60 * 1000;
        const end = start + durationMs;
        const blockStart = block.startsAt.getTime();
        const blockEnd = block.endsAt.getTime();
        return start < blockEnd && end > blockStart;
      });

      for (const req of toRejectRequests) {
        req.status = 'rejected';
        await this.meetingRequestRepository.save(req);

        const apt = await this.appointmentRepository.findOne({
          where: { meetingRequestId: req.id },
        });
        if (apt && ['accepted', 'paid'].includes(apt.status)) {
          apt.status = 'cancelled';
          await this.appointmentRepository.save(apt);
        }

        const userEmail = req.user?.email;
        if (userEmail) {
          const requestedPl = req.requestedStartsAt!.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
          const wizardName = (req.advertisement as { user?: { username?: string } })?.user?.username ?? 'wróżka';
          this.emailService
            .send({
              to: userEmail,
              subject: 'Twój wniosek o spotkanie został anulowany – eWróżka',
              type: EmailType.MEETING_REQUEST_CANCELLED_BY_BLOCK,
              context: {
                username: (req.user as { username?: string })?.username ?? 'Użytkownik',
                wizardName,
                requestedAt: requestedPl,
                appUrl,
              },
            })
            .catch((err) =>
              this.logger.error(`Failed to send meeting request cancellation email to ${userEmail}: ${err instanceof Error ? err.message : String(err)}`),
            );
        }
        this.logger.log(`Meeting request ${req.id} rejected due to block removal`);
      }
    }

    await this.availabilityRepository.remove(block);
  }

  async getSlotsForAdvertisement(
    advertisementId: number,
    fromDate: string,
    toDate: string,
  ): Promise<SlotDto[]> {
    const ad = await this.advertisementRepository.findOne({
      where: { id: advertisementId },
      relations: ['user'],
    });
    if (!ad) {
      throw new NotFoundException('Ogłoszenie nie istnieje');
    }
    const wrozkaId = ad.userId;
    const durationMinutes = ad.durationMinutes;

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to <= from) return [];

    const blocks = await this.availabilityRepository.find({
      where: {
        userId: wrozkaId,
        startsAt: LessThan(to),
        endsAt: MoreThan(from),
      },
      order: { startsAt: 'ASC' },
    });

    const slots: SlotDto[] = [];
    const slotDurationMs = durationMinutes * 60 * 1000;

    for (const block of blocks) {
      let slotStart = new Date(Math.max(block.startsAt.getTime(), from.getTime()));
      const blockEnd = block.endsAt.getTime();
      while (slotStart.getTime() + slotDurationMs <= blockEnd) {
        const slotEnd = new Date(slotStart.getTime() + slotDurationMs);
        const dateStr = slotStart.toISOString().slice(0, 10);
        const startTimeStr = slotStart.toISOString().slice(11, 16);
        const endTimeStr = slotEnd.toISOString().slice(11, 16);
        slots.push({
          startsAt: slotStart.toISOString(),
          endsAt: slotEnd.toISOString(),
          date: dateStr,
          startTime: startTimeStr,
        });
        slotStart = slotEnd;
      }
    }

    // Zajęte przedziały: spotkania (wszystkie ogłoszenia) + rezerwacje gości (wszystkie ogłoszenia)
    const busyRanges: { start: number; end: number }[] = [];

    const appointments = await this.appointmentRepository.find({
      where: { wrozkaId },
    });
    for (const a of appointments) {
      if (['accepted', 'paid', 'completed'].includes(a.status)) {
        const start = a.startsAt.getTime();
        const end = start + a.durationMinutes * 60 * 1000;
        busyRanges.push({ start, end });
      }
    }

    const guestBookings = await this.guestBookingRepository.find({
      where: { wizardId: wrozkaId },
    });
    for (const g of guestBookings) {
      if (['pending', 'accepted', 'paid'].includes(g.status)) {
        const start = g.scheduledAt.getTime();
        const end = start + g.durationMinutes * 60 * 1000;
        busyRanges.push({ start, end });
      }
    }

    const pendingRequests = await this.meetingRequestRepository.find({
      where: { advertisementId, status: 'pending' },
    });
    const pendingStarts = new Set<string>();
    for (const r of pendingRequests) {
      if (r.requestedStartsAt) {
        pendingStarts.add(r.requestedStartsAt.toISOString());
      }
    }

    const overlaps = (slotStartMs: number, slotEndMs: number) =>
      busyRanges.some(
        (r) => slotStartMs < r.end && slotEndMs > r.start,
      );

    const now = new Date();
    const minStartFromNowMs = 5 * 60 * 1000;
    const minStartsAt = new Date(now.getTime() + minStartFromNowMs);

    return slots.filter((s) => {
      const startsAt = new Date(s.startsAt);
      const endsAt = new Date(s.endsAt);
      const slotStartMs = startsAt.getTime();
      const slotEndMs = endsAt.getTime();
      if (startsAt <= minStartsAt) return false;
      if (pendingStarts.has(s.startsAt)) return false;
      if (overlaps(slotStartMs, slotEndMs)) return false;
      return true;
    });
  }
}
