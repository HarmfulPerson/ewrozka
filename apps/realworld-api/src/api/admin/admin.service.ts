import { randomBytes } from 'crypto';
import type { AllConfigType } from '@/config/config.type';

import {
  BadRequestException,

  ConflictException,

  Injectable,

  Logger,

  NotFoundException,

} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { InjectRepository } from '@nestjs/typeorm';

import {

  AdvertisementEntity,

  AppointmentEntity,

  AvailabilityEntity,

  PlatformFeeConfigEntity,

  PlatformFeeTierEntity,

  PlatformRevenueEntity,

  ReminderConfigEntity,

  RoleEntity,

  TopicEntity,

  TransactionEntity,

  UserEntity,

  WizardApplicationEntity,

} from '@repo/postgresql-typeorm';

import { In, Repository } from 'typeorm';

import { EmailService } from '../email/email.service';

import { FeaturedService } from '../featured/featured.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CommissionTierService } from '../payment/commission-tier.service';



export type WizardApplicationStatus = 'pending' | 'approved' | 'rejected';



export interface WizardApplicationDto {

  id: string;

  username: string;

  email: string;

  bio: string;

  image: string;

  phone: string | null;

  wizardApplicationStatus: WizardApplicationStatus;

  rejectionReason: string | null;

  createdAt: Date | null;

}



export interface WizardApplicationsPageDto {

  data: WizardApplicationDto[];

  total: number;

  page: number;

  limit: number;

}



/** Filtry listy wróżek (admin) */

export interface AdminWizardsFilters {

  minMeetings?: number;

  maxMeetings?: number;

  minEarnedGrosze?: number;

  maxEarnedGrosze?: number;

  availableNow?: boolean;

}



export type AdminWizardsSortBy =

  | 'name'

  | 'joinDate'

  | 'earnedGrosze'

  | 'meetingsCount'

  | 'announcementsCount'

  | 'pendingVideo';



export interface AdminWizardRowDto {

  id: number;

  username: string;

  email: string;

  image: string;

  createdAt: Date;

  meetingsCount: number;

  earnedGrosze: number;

  announcementsCount: number;

  isAvailableNow: boolean;

  isFeatured: boolean;

  hasPendingVideo: boolean;

}



export interface AdminWizardsPageDto {

  data: AdminWizardRowDto[];

  total: number;

  page: number;

  limit: number;

}



export interface AdminWizardDetailDto {

  id: number;

  username: string;

  email: string;

  image: string;

  bio: string;

  phone: string | null;

  createdAt: Date;

  meetingsCount: number;

  earnedGrosze: number;

  announcementsCount: number;

  isAvailableNow: boolean;

  isFeatured: boolean;

  featuredExpiresAt: Date | null;

  topicNames: string[];

  platformFeePercent: number | null;

  /** Prowizja z progów (spotkania w oknie) – do podglądu / „Oblicz z progów” */

  tierBasedFee?: {
    meetingsInWindow: number;
    windowDays: number;
    feePercent: number;
  };
  video: string | null;
  videoPending: string | null;
}



@Injectable()

export class AdminService {

  private readonly logger = new Logger(AdminService.name);



  constructor(

    @InjectRepository(WizardApplicationEntity)

    private readonly appRepo: Repository<WizardApplicationEntity>,

    @InjectRepository(UserEntity)

    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(RoleEntity)

    private readonly roleRepo: Repository<RoleEntity>,

    @InjectRepository(TopicEntity)

    private readonly topicRepo: Repository<TopicEntity>,

    @InjectRepository(AppointmentEntity)

    private readonly appointmentRepo: Repository<AppointmentEntity>,

    @InjectRepository(TransactionEntity)

    private readonly transactionRepo: Repository<TransactionEntity>,

    @InjectRepository(AvailabilityEntity)

    private readonly availabilityRepo: Repository<AvailabilityEntity>,

    @InjectRepository(AdvertisementEntity)

    private readonly advertisementRepo: Repository<AdvertisementEntity>,

    @InjectRepository(PlatformFeeConfigEntity)

    private readonly platformFeeConfigRepo: Repository<PlatformFeeConfigEntity>,

    @InjectRepository(PlatformFeeTierEntity)

    private readonly platformFeeTierRepo: Repository<PlatformFeeTierEntity>,

    @InjectRepository(ReminderConfigEntity)

    private readonly reminderConfigRepo: Repository<ReminderConfigEntity>,

    @InjectRepository(PlatformRevenueEntity)
    private readonly platformRevenueRepo: Repository<PlatformRevenueEntity>,

    private readonly commissionTierService: CommissionTierService,

    private readonly configService: ConfigService<AllConfigType>,

    private readonly emailService: EmailService,

    private readonly featuredService: FeaturedService,

    private readonly notificationsService: NotificationsService,

  ) {}



  async getWizardApplications(

    status?: WizardApplicationStatus,

    page: number = 1,

    limit: number = 5,

  ): Promise<WizardApplicationsPageDto> {

    const where = status ? { status } : {};

    const safePage = Math.max(1, page);

    const safeLimit = Math.min(Math.max(1, limit), 50);



    const [apps, total] = await this.appRepo.findAndCount({

      where,

      order: { createdAt: 'DESC' },

      skip: (safePage - 1) * safeLimit,

      take: safeLimit,

    });



    return {

      data: apps.map((a) => ({

        id: a.id,

        username: a.username,

        email: a.email,

        bio: a.bio,

        image: a.image,

        phone: a.phone ?? null,

        wizardApplicationStatus: a.status as WizardApplicationStatus,

        rejectionReason: a.rejectionReason ?? null,

        createdAt: a.createdAt,

      })),

      total,

      page: safePage,

      limit: safeLimit,

    };

  }



  async getWizardApplication(id: string): Promise<WizardApplicationDto> {

    const app = await this.appRepo.findOne({ where: { id } });

    if (!app) throw new NotFoundException('Wniosek nie istnieje.');



    return {

      id: app.id,

      username: app.username,

      email: app.email,

      bio: app.bio,

      image: app.image,

      phone: app.phone ?? null,

      wizardApplicationStatus: app.status as WizardApplicationStatus,

      rejectionReason: app.rejectionReason ?? null,

      createdAt: app.createdAt,

    };

  }



  async approveWizardApplication(id: string): Promise<void> {

    const app = await this.appRepo.findOne({ where: { id } });

    if (!app) throw new NotFoundException('Wniosek nie istnieje.');

    if (app.status !== 'pending') {

      throw new BadRequestException('Wniosek nie jest w statusie oczekującym.');

    }



    // Sprawdź czy email nie jest już zajęty

    const existingUser = await this.userRepo.findOne({
      where: { email: app.email },
    });

    if (existingUser) {

      throw new ConflictException(
        'Użytkownik z tym adresem e-mail już istnieje w systemie.',
      );

    }



    const wizardRole = await this.roleRepo.findOne({
      where: { name: 'wizard' },
    });

    if (!wizardRole)
      throw new NotFoundException('Rola "wizard" nie istnieje w bazie danych.');



    // Resolve referral code from wizard application
    let referredBy: number | null = null;
    if (app.referralCodeUsed) {
      const referrer = await this.userRepo.findOne({
        where: { referralCode: app.referralCodeUsed },
        select: ['id'],
      });
      if (referrer) referredBy = referrer.id;
    }

    // Utwórz użytkownika – hasło jest już zahashowane, @BeforeInsert nie rehashuje argon2

    const user = this.userRepo.create({

      email: app.email,

      username: app.username,

      password: app.passwordHash,

      bio: app.bio,

      phone: app.phone,

      image: app.image,

      emailVerified: true,

      roles: [wizardRole],

      wizardApplicationStatus: 'approved',

      googleId: app.googleId ?? undefined,

      gender: app.gender ?? null,

      referralCode: randomBytes(4).toString('hex'),
      referredBy,

    });



    if (app.topicIds?.length) {

      const topics = await this.topicRepo.findBy({ id: In(app.topicIds) });

      user.topics = topics;

    }



    await this.userRepo.save(user);



    app.status = 'approved';

    await this.appRepo.save(app);



    // Wyślij emaile z powiadomieniem o zatwierdzeniu i powitaniem (nie blokuj odpowiedzi)
    this.emailService
      .sendWizardApplicationApproved(app.email, app.username)
      .catch((err) => this.logger.error('Failed to send approval email', err));
    this.emailService
      .sendWelcomeWizard(app.email, app.username)
      .catch((err) => this.logger.error('Failed to send welcome wizard email', err));
  }



  async rejectWizardApplication(id: string, reason?: string): Promise<void> {

    const app = await this.appRepo.findOne({ where: { id } });

    if (!app) throw new NotFoundException('Wniosek nie istnieje.');

    if (app.status !== 'pending') {

      throw new BadRequestException('Wniosek nie jest w statusie oczekującym.');

    }



    app.status = 'rejected';

    app.rejectionReason = reason?.trim() || null;

    await this.appRepo.save(app);



    // Wyślij email z powodem odrzucenia (nie blokuj odpowiedzi)

    this.emailService

      .sendWizardApplicationRejected(
        app.email,
        app.username,
        app.rejectionReason,
      )

      .catch((err) => this.logger.error('Failed to send rejection email', err));

  }



  // ─── Lista wróżek (admin) ─────────────────────────────────────────────────────



  async getWizards(

    filters: AdminWizardsFilters = {},

    sortBy: AdminWizardsSortBy = 'joinDate',

    sortOrder: 'asc' | 'desc' = 'desc',

    page: number = 1,

    limit: number = 10,

  ): Promise<AdminWizardsPageDto> {

    const safePage = Math.max(1, page);

    const safeLimit = Math.min(Math.max(1, limit), 50);

    const now = new Date();



    const qb = this.userRepo

      .createQueryBuilder('u')

      .innerJoin('u.roles', 'r', "r.name = 'wizard'")

      .select('u.id', 'id')

      .addSelect('u.username', 'username')

      .addSelect('u.email', 'email')

      .addSelect('u.image', 'image')

      .addSelect('u.created_at', 'createdAt')

      .addSelect('u.video_pending', 'videoPending')

      .addSelect(

        `(SELECT COUNT(*)::int FROM appointment a WHERE a.wrozka_id = u.id)`,

        'meetingsCount',

      )

      .addSelect(

        `(SELECT COALESCE(SUM(t.wizard_amount), 0)::bigint FROM transaction t WHERE t.user_id = u.id AND t.status = :txStatus)`,

        'earnedGrosze',

      )

      .addSelect(

        `(SELECT COUNT(*)::int FROM advertisement ad WHERE ad.user_id = u.id)`,

        'announcementsCount',

      )

      .addSelect(

        `(SELECT EXISTS (SELECT 1 FROM availability av WHERE av.user_id = u.id AND av.starts_at <= :now AND av.ends_at >= :now))`,

        'isAvailableNow',

      )

      .setParameter('now', now)

      .setParameter('txStatus', 'completed');



    if (filters.minMeetings != null) {

      qb.andWhere(

        '(SELECT COUNT(*) FROM appointment a2 WHERE a2.wrozka_id = u.id) >= :minMeetings',

        { minMeetings: filters.minMeetings },

      );

    }

    if (filters.maxMeetings != null) {

      qb.andWhere(

        '(SELECT COUNT(*) FROM appointment a2 WHERE a2.wrozka_id = u.id) <= :maxMeetings',

        { maxMeetings: filters.maxMeetings },

      );

    }

    if (filters.minEarnedGrosze != null) {

      qb.andWhere(

        '(SELECT COALESCE(SUM(t2.wizard_amount), 0) FROM transaction t2 WHERE t2.user_id = u.id AND t2.status = :txStatus) >= :minEarned',

        { minEarned: filters.minEarnedGrosze },

      );

    }

    if (filters.maxEarnedGrosze != null) {

      qb.andWhere(

        '(SELECT COALESCE(SUM(t2.wizard_amount), 0) FROM transaction t2 WHERE t2.user_id = u.id AND t2.status = :txStatus) <= :maxEarned',

        { maxEarned: filters.maxEarnedGrosze },

      );

    }

    if (filters.availableNow === true) {

      qb.andWhere(

        'EXISTS (SELECT 1 FROM availability av2 WHERE av2.user_id = u.id AND av2.starts_at <= :now AND av2.ends_at >= :now)',

      );

    }



    const orderDir = sortOrder.toUpperCase() as 'ASC' | 'DESC';

    if (sortBy === 'pendingVideo') {

      qb.orderBy('CASE WHEN u.video_pending IS NOT NULL THEN 1 ELSE 0 END', 'DESC');

      qb.addOrderBy('u.created_at', orderDir);

    } else if (sortBy === 'name') {

      qb.orderBy('u.username', orderDir);

    } else if (sortBy === 'joinDate') {

      qb.orderBy('u.created_at', orderDir);

    } else if (sortBy === 'earnedGrosze') {

      qb.orderBy(

        '(SELECT COALESCE(SUM(t3.wizard_amount), 0) FROM transaction t3 WHERE t3.user_id = u.id AND t3.status = :txStatus)',

        orderDir,

      );

    } else if (sortBy === 'meetingsCount') {

      qb.orderBy(

        '(SELECT COUNT(*) FROM appointment a3 WHERE a3.wrozka_id = u.id)',

        orderDir,

      );

    } else {

      qb.orderBy(

        '(SELECT COUNT(*) FROM advertisement ad3 WHERE ad3.user_id = u.id)',

        orderDir,

      );

    }



    const total = await qb.getCount();

    const rawItems = await qb

      .skip((safePage - 1) * safeLimit)

      .take(safeLimit)

      .getRawMany();



    const featuredIds = new Set(

      await this.featuredService.getActiveFeaturedWizardIds(),

    );



    const data: AdminWizardRowDto[] = rawItems.map(
      (r: Record<string, unknown>) => ({

        id: Number(r.id),

        username: String(r.username),

        email: String(r.email),

        image: String(r.image ?? ''),

        createdAt: r.createdAt as Date,

        meetingsCount: Number(r.meetingsCount ?? 0),

        earnedGrosze: Number(r.earnedGrosze ?? 0),

        announcementsCount: Number(r.announcementsCount ?? 0),

        isAvailableNow: Number(r.isAvailableNow ?? 0) === 1,

        isFeatured: featuredIds.has(Number(r.id)),

        hasPendingVideo: !!r.videoPending,

      }),
    );



    return {

      data,

      total,

      page: safePage,

      limit: safeLimit,

    };

  }



  async getWizardById(id: number): Promise<AdminWizardDetailDto> {

    const user = await this.userRepo.findOne({

      where: { id },

      relations: ['roles', 'topics'],

    });

    if (!user) throw new NotFoundException('Specjalista nie istnieje.');

    const isWizard = user.roles?.some((r) => r.name === 'wizard');

    if (!isWizard) throw new NotFoundException('Użytkownik nie jest specjalistą.');



    const now = new Date();



    const [meetingsRow] = await this.appointmentRepo

      .createQueryBuilder('a')

      .select('COUNT(a.id)', 'cnt')

      .where('a.wrozka_id = :id', { id })

      .getRawMany<{ cnt: string }>();



    const [earnedRow] = await this.transactionRepo

      .createQueryBuilder('t')

      .select('COALESCE(SUM(t.wizard_amount), 0)', 'total')

      .where('t.user_id = :id', { id })

      .andWhere('t.status = :status', { status: 'completed' })

      .getRawMany<{ total: string }>();



    const [adsRow] = await this.advertisementRepo

      .createQueryBuilder('ad')

      .select('COUNT(ad.id)', 'cnt')

      .where('ad.user_id = :id', { id })

      .getRawMany<{ cnt: string }>();



    const availCount = await this.availabilityRepo

      .createQueryBuilder('av')

      .where('av.user_id = :id', { id })

      .andWhere('av.starts_at <= :now', { now })

      .andWhere('av.ends_at >= :now', { now })

      .getCount();



    const { isFeatured, expiresAt } =
      await this.featuredService.getWizardFeaturedStatus(id);

    const tierStatus = await this.commissionTierService.getTierStatus(id);



    return {

      id: user.id,

      username: user.username,

      email: user.email,

      image: user.image,

      bio: user.bio ?? '',

      phone: user.phone ?? null,

      createdAt: user.createdAt,

      meetingsCount: parseInt(meetingsRow?.cnt ?? '0', 10),

      earnedGrosze: parseInt(earnedRow?.total ?? '0', 10),

      announcementsCount: parseInt(adsRow?.cnt ?? '0', 10),

      isAvailableNow: availCount > 0,

      isFeatured,

      featuredExpiresAt: expiresAt ?? null,

      topicNames: (user.topics ?? []).map((t) => t.name),

      platformFeePercent: user.platformFeePercent ?? null,

      tierBasedFee: {

        meetingsInWindow: tierStatus.meetingsInWindow,

        windowDays: tierStatus.windowDays,

        feePercent: tierStatus.platformFeePercent,

      },

      video: user.video ?? null,

      videoPending: user.videoPending ?? null,

    };

  }



  async getPendingVideoCount(): Promise<number> {

    return this.userRepo

      .createQueryBuilder('u')

      .innerJoin('u.roles', 'r', "r.name = 'wizard'")

      .where('u.video_pending IS NOT NULL')

      .getCount();

  }



  async approveWizardVideo(wizardId: number): Promise<void> {

    const user = await this.userRepo.findOne({ where: { id: wizardId }, relations: ['roles'] });

    if (!user) throw new NotFoundException('Specjalista nie istnieje.');

    if (!user.roles?.some((r) => r.name === 'wizard')) {

      throw new NotFoundException('Użytkownik nie jest specjalistą.');

    }

    if (!user.videoPending) {

      throw new BadRequestException('Brak filmiku do zatwierdzenia.');

    }

    user.video = user.videoPending;

    user.videoPending = null;

    await this.userRepo.save(user);

    this.notificationsService.notifyAdminVideoPending().catch((err) =>

      this.logger.warn('notifyAdminVideoPending failed', err),

    );

  }



  async rejectWizardVideo(wizardId: number): Promise<void> {

    const user = await this.userRepo.findOne({ where: { id: wizardId }, relations: ['roles'] });

    if (!user) throw new NotFoundException('Specjalista nie istnieje.');

    if (!user.roles?.some((r) => r.name === 'wizard')) {

      throw new NotFoundException('Użytkownik nie jest specjalistą.');

    }

    if (!user.videoPending) {

      throw new BadRequestException('Brak filmiku do odrzucenia.');

    }

    user.videoPending = null;

    await this.userRepo.save(user);

    this.notificationsService.notifyAdminVideoPending().catch((err) =>

      this.logger.warn('notifyAdminVideoPending failed', err),

    );

  }



  async updateWizardPlatformFee(

    id: number,

    platformFeePercent: number,

  ): Promise<void> {

    const user = await this.userRepo.findOne({

      where: { id },

      relations: ['roles'],

    });

    if (!user) throw new NotFoundException('Specjalista nie istnieje.');

    const isWizard = user.roles?.some((r) => r.name === 'wizard');

    if (!isWizard) throw new NotFoundException('Użytkownik nie jest specjalistą.');

    if (platformFeePercent < 0 || platformFeePercent > 100) {

      throw new BadRequestException('Prowizja musi być w zakresie 0–100.');

    }

    user.platformFeePercent = platformFeePercent;

    await this.userRepo.save(user);

    this.logger.log(

      `Admin ustawił prowizję dla specjalisty ${id} na ${platformFeePercent}%`,

    );

  }



  /** Czyści override prowizji – specjalista przechodzi na prowizję z progów. */

  async resetWizardPlatformFeeToTier(id: number): Promise<void> {

    const user = await this.userRepo.findOne({

      where: { id },

      relations: ['roles'],

    });

    if (!user) throw new NotFoundException('Specjalista nie istnieje.');

    const isWizard = user.roles?.some((r) => r.name === 'wizard');

    if (!isWizard) throw new NotFoundException('Użytkownik nie jest specjalistą.');

    user.platformFeePercent = null;

    await this.userRepo.save(user);

    this.logger.log(

      `Admin zresetował prowizję specjalisty ${id} – używana prowizja z progów`,

    );

  }



  async setWizardFeatured(id: number): Promise<void> {

    const user = await this.userRepo.findOne({

      where: { id },

      relations: ['roles'],

    });

    if (!user) throw new NotFoundException('Specjalista nie istnieje.');

    const isWizard = user.roles?.some((r) => r.name === 'wizard');

    if (!isWizard) throw new NotFoundException('Użytkownik nie jest specjalistą.');



    const { isFeatured } =
      await this.featuredService.getWizardFeaturedStatus(id);

    if (isFeatured) {

      throw new BadRequestException('Specjalista ma już aktywne wyróżnienie.');

    }



    const cfg = this.configService.getOrThrow('featured', { infer: true });

    const durationHours = cfg?.durationHours ?? 6;

    await this.featuredService.activateFeatured(id, null, durationHours);

    this.logger.log(
      `Admin ustawił wyróżnienie dla specjalisty ${id} (bez płatności)`,
    );

  }



  /** Konfiguracja progów prowizji – odczyt. */

  async getCommissionTierConfig(): Promise<{

    windowDays: number;

    tiers: {
      minMeetings: number;
      maxMeetings: number | null;
      feePercent: number;
    }[];

  }> {

    const config = await this.platformFeeConfigRepo.findOne({

      where: { id: 1 },

    });

    if (!config) {

      return { windowDays: 90, tiers: [] };

    }

    const tiers = await this.platformFeeTierRepo.find({

      where: { configId: config.id },

      order: { sortOrder: 'ASC' },

    });

    return {

      windowDays: config.windowDays,

      tiers: tiers.map((t) => ({

        minMeetings: t.minMeetings,

        maxMeetings: t.maxMeetings,

        feePercent: t.feePercent,

      })),

    };

  }



  /** Konfiguracja progów prowizji – aktualizacja (okno + progi). */

  async updateCommissionTierConfig(body: {

    windowDays?: number;

    tiers?: {
      minMeetings: number;
      maxMeetings: number | null;
      feePercent: number;
    }[];

  }): Promise<void> {

    const config = await this.platformFeeConfigRepo.findOne({

      where: { id: 1 },

    });

    if (!config) {

      throw new NotFoundException(

        'Brak konfiguracji progów. Uruchom migrację bazy danych.',

      );

    }



    if (body.windowDays != null) {

      if (body.windowDays < 1 || body.windowDays > 365) {

        throw new BadRequestException('Okres musi być w zakresie 1–365 dni.');

      }

      config.windowDays = body.windowDays;

      await this.platformFeeConfigRepo.save(config);

    }



    if (body.tiers != null) {

      for (const t of body.tiers) {

        if (t.feePercent < 0 || t.feePercent > 100) {

          throw new BadRequestException(

            `Prowizja ${t.feePercent}% musi być w zakresie 0–100.`,

          );

        }

        if (t.minMeetings < 0) {

          throw new BadRequestException(

            'Minimalna liczba spotkań nie może być ujemna.',

          );

        }

        if (t.maxMeetings != null && t.maxMeetings < t.minMeetings) {

          throw new BadRequestException(

            'Maksymalna liczba spotkań nie może być mniejsza od minimalnej.',

          );

        }

      }

      for (let i = 0; i < body.tiers.length; i++) {

        for (let j = i + 1; j < body.tiers.length; j++) {

          const a = body.tiers[i];

          const b = body.tiers[j];

          const maxA = a.maxMeetings ?? Infinity;

          const maxB = b.maxMeetings ?? Infinity;

          if (a.minMeetings <= maxB && maxA >= b.minMeetings) {

            throw new BadRequestException(

              'Progi nie mogą na siebie zachodzić – każdy zakres musi być osobny.',

            );

          }

        }

      }

      await this.platformFeeTierRepo.delete({ configId: config.id });

      for (let i = 0; i < body.tiers.length; i++) {

        const t = body.tiers[i];

        const tier = this.platformFeeTierRepo.create({

          configId: config.id,

          minMeetings: t.minMeetings,

          maxMeetings: t.maxMeetings,

          feePercent: t.feePercent,

          sortOrder: i,

        });

        await this.platformFeeTierRepo.save(tier);

      }

      this.logger.log(

        `Admin zaktualizował progi prowizji: ${body.tiers.length} progów`,

      );

    }

  }

  /** Konfiguracja przypomnień o spotkaniach. */
  async getReminderConfig(): Promise<{
    enabled48h: boolean;
    enabled24h: boolean;
    enabled1h: boolean;
    hoursSlot1: number;
    hoursSlot2: number;
    hoursSlot3: number;
  }> {
    const config = await this.reminderConfigRepo.findOne({ where: { id: 1 } });
    if (!config) {
      return { enabled48h: true, enabled24h: true, enabled1h: true, hoursSlot1: 48, hoursSlot2: 24, hoursSlot3: 1 };
    }
    return {
      enabled48h: config.enabled48h,
      enabled24h: config.enabled24h,
      enabled1h: config.enabled1h,
      hoursSlot1: config.hoursSlot1,
      hoursSlot2: config.hoursSlot2,
      hoursSlot3: config.hoursSlot3,
    };
  }

  /** Aktualizacja konfiguracji przypomnień. */
  async updateReminderConfig(body: {
    enabled48h?: boolean;
    enabled24h?: boolean;
    enabled1h?: boolean;
    hoursSlot1?: number;
    hoursSlot2?: number;
    hoursSlot3?: number;
  }): Promise<void> {
    const config = await this.reminderConfigRepo.findOne({ where: { id: 1 } });
    if (!config) {
      throw new NotFoundException(
        'Brak konfiguracji przypomnień. Uruchom migrację bazy danych.',
      );
    }
    if (body.enabled48h !== undefined) config.enabled48h = body.enabled48h;
    if (body.enabled24h !== undefined) config.enabled24h = body.enabled24h;
    if (body.enabled1h !== undefined) config.enabled1h = body.enabled1h;
    if (body.hoursSlot1 !== undefined && body.hoursSlot1 >= 1) config.hoursSlot1 = body.hoursSlot1;
    if (body.hoursSlot2 !== undefined && body.hoursSlot2 >= 1) config.hoursSlot2 = body.hoursSlot2;
    if (body.hoursSlot3 !== undefined && body.hoursSlot3 >= 1) config.hoursSlot3 = body.hoursSlot3;
    await this.reminderConfigRepo.save(config);
  }

  // ══════════════════════════════════════════════════════════════
  // Analytics
  // ══════════════════════════════════════════════════════════════

  async getRevenueAnalytics(
    from: string,
    to: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const trunc = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : 'month';

    const rows = await this.platformRevenueRepo
      .createQueryBuilder('r')
      .select(`DATE_TRUNC('${trunc}', r.date)::date`, 'date')
      .addSelect('SUM(r.total_fees)::bigint', 'platformFeesGrosze')
      .addSelect('SUM(r.total_wizard_payouts)::bigint', 'wizardPayoutsGrosze')
      .addSelect('SUM(r.total_volume)::bigint', 'totalVolumeGrosze')
      .addSelect('SUM(r.transaction_count)::int', 'transactionCount')
      .where('r.date >= :from', { from })
      .andWhere('r.date <= :to', { to })
      .groupBy(`DATE_TRUNC('${trunc}', r.date)`)
      .orderBy(`DATE_TRUNC('${trunc}', r.date)`, 'ASC')
      .getRawMany();

    let totalPlatformFees = 0;
    let totalWizardPayouts = 0;
    let totalVolume = 0;
    let totalTransactions = 0;

    const data = rows.map((r) => {
      const pf = Number(r.platformFeesGrosze) / 100;
      const wp = Number(r.wizardPayoutsGrosze) / 100;
      const tv = Number(r.totalVolumeGrosze) / 100;
      const tc = Number(r.transactionCount);
      totalPlatformFees += pf;
      totalWizardPayouts += wp;
      totalVolume += tv;
      totalTransactions += tc;
      return {
        date: r.date,
        platformFees: pf,
        wizardPayouts: wp,
        totalVolume: tv,
        transactionCount: tc,
      };
    });

    return {
      data,
      summary: {
        totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
        totalWizardPayouts: Math.round(totalWizardPayouts * 100) / 100,
        totalVolume: Math.round(totalVolume * 100) / 100,
        totalTransactions,
      },
    };
  }

  async getRegistrationAnalytics(
    from: string,
    to: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const trunc = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : 'month';

    const rows = await this.userRepo
      .createQueryBuilder('u')
      .select(`DATE_TRUNC('${trunc}', u.created_at)::date`, 'date')
      .addSelect('COUNT(*)::int', 'total')
      .addSelect(
        `COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM user_role ur JOIN role r ON ur.role_id = r.id
          WHERE ur.user_id = u.id AND r.name = 'client'
        ))::int`,
        'clients',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM user_role ur JOIN role r ON ur.role_id = r.id
          WHERE ur.user_id = u.id AND r.name = 'wizard'
        ))::int`,
        'wizards',
      )
      .addSelect('COUNT(*) FILTER (WHERE u.referred_by IS NOT NULL)::int', 'fromReferral')
      .where('u.created_at >= :from', { from })
      .andWhere('u.created_at < :toNext', { toNext: to + 'T23:59:59.999Z' })
      .groupBy(`DATE_TRUNC('${trunc}', u.created_at)`)
      .orderBy(`DATE_TRUNC('${trunc}', u.created_at)`, 'ASC')
      .getRawMany();

    let totalAll = 0;
    let totalClients = 0;
    let totalWizards = 0;
    let totalReferral = 0;

    const data = rows.map((r) => {
      const t = Number(r.total);
      const c = Number(r.clients);
      const w = Number(r.wizards);
      const ref = Number(r.fromReferral);
      totalAll += t;
      totalClients += c;
      totalWizards += w;
      totalReferral += ref;
      return { date: r.date, total: t, clients: c, wizards: w, fromReferral: ref };
    });

    return {
      data,
      summary: { total: totalAll, clients: totalClients, wizards: totalWizards, fromReferral: totalReferral },
    };
  }

  async getWizardRevenueAnalytics(from: string, to: string, limit = 10) {
    const rows = await this.transactionRepo
      .createQueryBuilder('t')
      .innerJoin('t.user', 'u')
      .select('u.id', 'wizardId')
      .addSelect('u.username', 'username')
      .addSelect('u.image', 'image')
      .addSelect('SUM(t.wizard_amount)::bigint', 'wizardEarnedGrosze')
      .addSelect('SUM(t.platform_fee)::bigint', 'platformEarnedGrosze')
      .addSelect('COUNT(*)::int', 'transactionCount')
      .where('t.status = :status', { status: 'completed' })
      .andWhere('t.created_at >= :from', { from })
      .andWhere('t.created_at <= :to', { to: to + 'T23:59:59.999Z' })
      .groupBy('u.id')
      .addGroupBy('u.username')
      .addGroupBy('u.image')
      .orderBy('SUM(t.wizard_amount)', 'DESC')
      .limit(limit)
      .getRawMany();

    return {
      data: rows.map((r) => ({
        wizardId: Number(r.wizardId),
        username: r.username,
        image: r.image,
        wizardEarned: Number(r.wizardEarnedGrosze) / 100,
        platformEarned: Number(r.platformEarnedGrosze) / 100,
        transactionCount: Number(r.transactionCount),
      })),
    };
  }

}

