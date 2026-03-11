import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { AllConfigType } from '@/config/config.type';
import {
  AdvertisementEntity,
  AppointmentEntity,
  AvailabilityEntity,
  RoleEntity,
  TopicEntity,
  TransactionEntity,
  UserEntity,
  WizardApplicationEntity,
} from '@repo/postgresql-typeorm';
import { In, Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { FeaturedService } from '../featured/featured.service';

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
  | 'announcementsCount';

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
    private readonly configService: ConfigService<AllConfigType>,
    private readonly emailService: EmailService,
    private readonly featuredService: FeaturedService,
  ) {}

  async getWizardApplications(
    status?: WizardApplicationStatus,
    page: number = 1,
    limit: number = 5,
  ): Promise<WizardApplicationsPageDto> {
    const where = status ? { status } : {};
    const safePage  = Math.max(1, page);
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
    const existingUser = await this.userRepo.findOne({ where: { email: app.email } });
    if (existingUser) {
      throw new ConflictException('Użytkownik z tym adresem e-mail już istnieje w systemie.');
    }

    const wizardRole = await this.roleRepo.findOne({ where: { name: 'wizard' } });
    if (!wizardRole) throw new NotFoundException('Rola "wizard" nie istnieje w bazie danych.');

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
    });

    if (app.topicIds?.length) {
      const topics = await this.topicRepo.findBy({ id: In(app.topicIds) });
      user.topics = topics;
    }

    await this.userRepo.save(user);

    app.status = 'approved';
    await this.appRepo.save(app);

    // Wyślij email z powiadomieniem o zatwierdzeniu (nie blokuj odpowiedzi)
    this.emailService
      .sendWizardApplicationApproved(app.email, app.username)
      .catch((err) => this.logger.error('Failed to send approval email', err));
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
      .sendWizardApplicationRejected(app.email, app.username, app.rejectionReason)
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
    if (sortBy === 'name') {
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

    const data: AdminWizardRowDto[] = rawItems.map((r: Record<string, unknown>) => ({
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
    }));

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
    if (!user) throw new NotFoundException('Wróżka nie istnieje.');
    const isWizard = user.roles?.some((r) => r.name === 'wizard');
    if (!isWizard) throw new NotFoundException('Użytkownik nie jest wróżką.');

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

    const { isFeatured, expiresAt } = await this.featuredService.getWizardFeaturedStatus(id);

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
    };
  }

  async setWizardFeatured(id: number): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('Wróżka nie istnieje.');
    const isWizard = user.roles?.some((r) => r.name === 'wizard');
    if (!isWizard) throw new NotFoundException('Użytkownik nie jest wróżką.');

    const { isFeatured } = await this.featuredService.getWizardFeaturedStatus(id);
    if (isFeatured) {
      throw new BadRequestException('Wróżka ma już aktywne wyróżnienie.');
    }

    const cfg = this.configService.getOrThrow('featured', { infer: true });
    const durationHours = cfg?.durationHours ?? 6;
    await this.featuredService.activateFeatured(id, null, durationHours);
    this.logger.log(`Admin ustawił wyróżnienie dla wróżki ${id} (bez płatności)`);
  }
}
