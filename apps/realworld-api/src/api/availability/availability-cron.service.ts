import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AppointmentEntity,
  AvailabilityEntity,
  MeetingRequestEntity,
} from '@repo/postgresql-typeorm';
import { LessThan, Repository } from 'typeorm';

@Injectable()
export class AvailabilityCronService {
  private readonly logger = new Logger(AvailabilityCronService.name);

  constructor(
    @InjectRepository(AvailabilityEntity)
    private readonly availabilityRepository: Repository<AvailabilityEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepository: Repository<AppointmentEntity>,
    @InjectRepository(MeetingRequestEntity)
    private readonly meetingRequestRepository: Repository<MeetingRequestEntity>,
  ) {}

  // Co 30 minut usuwa przeszłe bloki dostępności bez aktywnych spotkań
  @Cron('0 */30 * * * *')
  async cleanPastAvailabilityBlocks() {
    const now = new Date();

    const pastBlocks = await this.availabilityRepository.find({
      where: { endsAt: LessThan(now) },
    });

    if (pastBlocks.length === 0) return;

    const toDelete: AvailabilityEntity[] = [];

    for (const block of pastBlocks) {
      // Sprawdź czy istnieje aktywne/zaakceptowane/opłacone spotkanie w oknie bloku
      const activeAppointment = await this.appointmentRepository
        .createQueryBuilder('a')
        .where('a.wrozkaId = :userId', { userId: block.userId })
        .andWhere('a.startsAt >= :start', { start: block.startsAt })
        .andWhere('a.startsAt < :end', { end: block.endsAt })
        .andWhere('a.status IN (:...statuses)', { statuses: ['accepted', 'paid', 'completed'] })
        .getOne();

      if (activeAppointment) continue;

      // Sprawdź czy istnieje oczekujący wniosek w oknie bloku
      const pendingRequest = await this.meetingRequestRepository
        .createQueryBuilder('r')
        .where('r.requestedStartsAt >= :start', { start: block.startsAt })
        .andWhere('r.requestedStartsAt < :end', { end: block.endsAt })
        .andWhere('r.status IN (:...statuses)', { statuses: ['pending', 'accepted'] })
        .getOne();

      if (pendingRequest) continue;

      toDelete.push(block);
    }

    if (toDelete.length > 0) {
      await this.availabilityRepository.remove(toDelete);
      this.logger.log(`Usunięto ${toDelete.length} przeszłych bloków dostępności`);
    }
  }
}
