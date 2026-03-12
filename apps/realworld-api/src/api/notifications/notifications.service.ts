import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GuestBookingEntity,
  MeetingRequestEntity,
  UserEntity,
} from '@repo/postgresql-typeorm';
import { Repository } from 'typeorm';

export interface NotificationsGatewayApi {
  emitPendingCount: (wizardId: number, count: number) => void;
  emitAdminPendingVideoCount: (count: number) => void;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /** Przechowuje referencję do gateway – ustawiana przez sam gateway po starcie. */
  private gateway: NotificationsGatewayApi | null = null;

  constructor(
    @InjectRepository(MeetingRequestEntity)
    private readonly meetingRequestRepo: Repository<MeetingRequestEntity>,
    @InjectRepository(GuestBookingEntity)
    private readonly guestBookingRepo: Repository<GuestBookingEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  setGateway(gw: NotificationsGatewayApi) {
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
      this.logger.debug(`Powiadomiono wróżkę ${wizardId}: ${total} oczekujących`);
    } catch (err) {
      this.logger.error(`Nie udało się powiadomić wróżki ${wizardId}`, err);
    }
  }

  /** Liczba wróżek z filmikiem do akceptacji (dla admina). */
  async getAdminPendingVideoCount(): Promise<number> {
    return this.userRepo
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r', "r.name = 'wizard'")
      .where('u.video_pending IS NOT NULL')
      .getCount();
  }

  /** Wywołaj po uploadzie/approve/reject filmiku – emituje licznik do pokoju admin. */
  async notifyAdminVideoPending(): Promise<void> {
    if (!this.gateway) return;
    try {
      const count = await this.getAdminPendingVideoCount();
      this.gateway.emitAdminPendingVideoCount(count);
      this.logger.debug(`Powiadomiono adminów: ${count} filmików do akceptacji`);
    } catch (err) {
      this.logger.error('Nie udało się powiadomić adminów o filmikach', err);
    }
  }
}
