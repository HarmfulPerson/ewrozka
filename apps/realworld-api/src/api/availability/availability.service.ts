import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  AppointmentEntity,
  AvailabilityEntity,
  GuestBookingEntity,
  MeetingRequestEntity,
} from '@repo/postgresql-typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
export interface SlotDto {
  startsAt: string;
  endsAt: string;
  date: string;
  startTime: string;
}

@Injectable()
export class AvailabilityService {
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

    // Blokuj usunięcie jeśli w oknie tego bloku istnieje aktywne spotkanie
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

    // Blokuj usunięcie jeśli w oknie istnieje oczekujący wniosek o spotkanie
    const ads = await this.advertisementRepository.find({
      where: { userId },
      select: ['id'],
    });
    const adIds = ads.map((a) => a.id);

    if (adIds.length > 0) {
      const pendingRequest = await this.meetingRequestRepository
        .createQueryBuilder('r')
        .where('r.advertisementId IN (:...adIds)', { adIds })
        .andWhere('r.requestedStartsAt >= :start', { start: block.startsAt })
        .andWhere('r.requestedStartsAt < :end', { end: block.endsAt })
        .andWhere('r.status IN (:...statuses)', { statuses: ['pending', 'accepted'] })
        .getOne();

      if (pendingRequest) {
        throw new BadRequestException(
          'Nie możesz usunąć tego bloku dostępności, ponieważ istnieje oczekujący wniosek o spotkanie w tym terminie. Odrzuć go najpierw lub poczekaj na zakończenie spotkania.',
        );
      }

      const guestBooking = await this.guestBookingRepository
        .createQueryBuilder('gb')
        .where('gb.advertisementId IN (:...adIds)', { adIds })
        .andWhere('gb.scheduledAt >= :start', { start: block.startsAt })
        .andWhere('gb.scheduledAt < :end', { end: block.endsAt })
        .andWhere('gb.status IN (:...statuses)', { statuses: ['pending', 'accepted', 'paid'] })
        .getOne();
      if (guestBooking) {
        throw new BadRequestException(
          'Nie możesz usunąć tego bloku dostępności, ponieważ istnieje rezerwacja gościa w tym terminie.',
        );
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

    const bookedStarts = new Set<string>();
    const appointments = await this.appointmentRepository.find({
      where: { wrozkaId },
    });
    for (const a of appointments) {
      if (['accepted', 'paid', 'completed'].includes(a.status)) {
        bookedStarts.add(a.startsAt.toISOString());
      }
    }
    const pendingRequests = await this.meetingRequestRepository.find({
      where: { advertisementId, status: 'pending' },
    });
    for (const r of pendingRequests) {
      if (r.requestedStartsAt) {
        bookedStarts.add(r.requestedStartsAt.toISOString());
      }
    }

    const guestBookings = await this.guestBookingRepository.find({
      where: { advertisementId },
    });
    for (const g of guestBookings) {
      if (['pending', 'accepted', 'paid'].includes(g.status)) {
        bookedStarts.add(g.scheduledAt.toISOString());
      }
    }

    return slots.filter((s) => !bookedStarts.has(s.startsAt));
  }
}
