import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GuestBookingEntity,
  MeetingRequestEntity,
  NotificationEntity,
  UserEntity,
} from '@repo/postgresql-typeorm';
import { Repository } from 'typeorm';
import { CreateNotificationPayload } from './notification-types';

export interface NotificationsGatewayApi {
  emitPendingCount: (wizardId: string, count: number) => void;
  emitAdminPendingVideoCount: (count: number) => void;
  emitNotification: (userId: string, notification: NotificationDto) => void;
}

export interface NotificationDto {
  uid: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  meta: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private gateway: NotificationsGatewayApi | null = null;

  constructor(
    @InjectRepository(MeetingRequestEntity)
    private readonly meetingRequestRepo: Repository<MeetingRequestEntity>,
    @InjectRepository(GuestBookingEntity)
    private readonly guestBookingRepo: Repository<GuestBookingEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
  ) {}

  setGateway(gw: NotificationsGatewayApi) {
    this.gateway = gw;
  }

  // ── Create & emit notification ──────────────────────────────────────────

  /** Tworzy powiadomienie w bazie i emituje przez WebSocket. */
  async createAndEmit(payload: CreateNotificationPayload): Promise<NotificationEntity> {
    const entity = this.notificationRepo.create({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
      meta: payload.meta ?? null,
      isRead: false,
    });
    const saved = await this.notificationRepo.save(entity);

    // Emit via WebSocket
    if (this.gateway) {
      this.gateway.emitNotification(payload.userId, this.toDto(saved));
    }

    this.logger.debug(`Notification [${payload.type}] for user ${payload.userId}: ${payload.title}`);
    return saved;
  }

  // ── Read / list ─────────────────────────────────────────────────────────

  async getForUser(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean },
  ): Promise<{ notifications: NotificationDto[]; total: number; unreadCount: number }> {
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = options?.offset ?? 0;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC');

    if (options?.unreadOnly) {
      qb.andWhere('n.isRead = false');
    }

    const [items, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const unreadCount = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });

    return {
      notifications: items.map(this.toDto),
      total,
      unreadCount,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, notificationUid: string): Promise<void> {
    await this.notificationRepo.update(
      { uid: notificationUid, userId },
      { isRead: true },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  // ── Legacy: pending count (backward compat) ─────────────────────────────

  async getPendingCount(wizardId: string): Promise<{
    regularCount: number;
    guestCount: number;
    total: number;
  }> {
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

  async notifyWizard(wizardId: string): Promise<void> {
    if (!this.gateway) return;
    try {
      const { total } = await this.getPendingCount(wizardId);
      this.gateway.emitPendingCount(wizardId, total);
    } catch (err) {
      this.logger.error(`Nie udało się powiadomić wróżki ${wizardId}`, err);
    }
  }

  async getAdminPendingVideoCount(): Promise<number> {
    return this.userRepo
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r', "r.name = 'wizard'")
      .where('u.video_pending IS NOT NULL')
      .getCount();
  }

  async notifyAdminVideoPending(): Promise<void> {
    if (!this.gateway) return;
    try {
      const count = await this.getAdminPendingVideoCount();
      this.gateway.emitAdminPendingVideoCount(count);
    } catch (err) {
      this.logger.error('Nie udało się powiadomić adminów o filmikach', err);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private toDto(entity: NotificationEntity): NotificationDto {
    return {
      uid: entity.uid,
      type: entity.type,
      title: entity.title,
      body: entity.body,
      link: entity.link,
      meta: entity.meta,
      isRead: entity.isRead,
      createdAt: entity.createdAt instanceof Date
        ? entity.createdAt.toISOString()
        : String(entity.createdAt),
    };
  }
}
