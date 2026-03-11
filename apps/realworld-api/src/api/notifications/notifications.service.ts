import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GuestBookingEntity,
  MeetingRequestEntity,
} from '@repo/postgresql-typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /** Przechowuje referencję do gateway – ustawiana przez sam gateway po starcie. */
  private gateway: { emitPendingCount: (wizardId: number, count: number) => void } | null = null;

  constructor(
    @InjectRepository(MeetingRequestEntity)
    private readonly meetingRequestRepo: Repository<MeetingRequestEntity>,
    @InjectRepository(GuestBookingEntity)
    private readonly guestBookingRepo: Repository<GuestBookingEntity>,
  ) {}

  setGateway(gw: { emitPendingCount: (wizardId: number, count: number) => void }) {
    this.gateway = gw;
  }

  async getPendingCount(wizardId: number): Promise<{
    regularCount: number;
    guestCount: number;
    total: number;
  }> {
    // MeetingRequest nie ma bezpośredniego wizardId – powiązanie przez Advertisement
    const regularCount = await this.meetingRequestRepo
      .createQueryBuilder('mr')
      .innerJoin('mr.advertisement', 'ad')
      .where('ad.userId = :wizardId', { wizardId })
      .andWhere('mr.status = :status', { status: 'pending' })
      .getCount();

    const guestCount = await this.guestBookingRepo.count({
      where: { wizardId, status: 'pending' },
    });

    return { regularCount, guestCount, total: regularCount + guestCount };
  }

  /** Wywołaj po każdym nowym wniosku – emituje aktualny licznik przez WebSocket. */
  async notifyWizard(wizardId: number): Promise<void> {
    if (!this.gateway) return;
    try {
      const { total } = await this.getPendingCount(wizardId);
      this.gateway.emitPendingCount(wizardId, total);
      this.logger.debug(`Notified wizard ${wizardId}: ${total} pending`);
    } catch (err) {
      this.logger.error(`Failed to notify wizard ${wizardId}`, err);
    }
  }
}
