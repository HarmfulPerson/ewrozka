import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PlatformFeeConfigEntity,
  PlatformFeeTierEntity,
} from '@repo/postgresql-typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { AllConfigType } from '@/config/config.type';

export interface TierInfo {
  feePercent: number;
  minMeetings: number;
  maxMeetings: number | null;
}

export interface CommissionTierStatus {
  meetingsInWindow: number;
  windowDays: number;
  currentTier: TierInfo;
  nextTier: TierInfo | null;
  platformFeePercent: number;
  /** true gdy admin ustawił prowizję ręcznie (user.platformFeePercent) */
  isSetByAdmin?: boolean;
}

@Injectable()
export class CommissionTierService {
  private readonly logger = new Logger(CommissionTierService.name);

  constructor(
    @InjectRepository(PlatformFeeConfigEntity)
    private readonly configRepository: Repository<PlatformFeeConfigEntity>,
    @InjectRepository(PlatformFeeTierEntity)
    private readonly tierRepository: Repository<PlatformFeeTierEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  private getDefaultFee(): number {
    return (
      this.configService.get('payment.platformFeePercentage', {
        infer: true,
      }) ?? 20
    );
  }

  /** Liczy zakończone spotkania wróżki w ostatnich N dniach (okno od momentu zakończenia). */
  async countCompletedMeetingsInWindow(
    wizardId: number,
    windowDays: number,
  ): Promise<number> {
    const result = await this.dataSource.query<[{ count: string }]>(
      `
      SELECT COUNT(*)::text AS count
      FROM appointment a
      WHERE a.wrozka_id = $1
        AND a.status = 'completed'
        AND (a.starts_at + (a.duration_minutes || ' minutes')::interval) >= (NOW() - ($2 || ' days')::interval)
      `,
      [wizardId, windowDays],
    );
    return parseInt(result[0]?.count ?? '0', 10);
  }

  /** Zwraca efektywny procent prowizji na podstawie progów (bez override z usera). */
  async getEffectiveFeePercent(wizardId: number): Promise<number> {
    const config = await this.configRepository.findOne({ where: { id: 1 } });
    if (!config) return this.getDefaultFee();

    const tiers = await this.tierRepository.find({
      where: { configId: config.id },
      order: { sortOrder: 'ASC' },
    });
    if (!tiers.length) return this.getDefaultFee();

    const meetings = await this.countCompletedMeetingsInWindow(
      wizardId,
      config.windowDays,
    );

    for (const tier of tiers) {
      const inRange =
        meetings >= tier.minMeetings &&
        (tier.maxMeetings == null || meetings <= tier.maxMeetings);
      if (inRange) {
        return tier.feePercent;
      }
    }
    return this.getDefaultFee();
  }

  /** Zwraca pełny status progu dla wróżki (meetingsInWindow, currentTier, nextTier). */
  async getTierStatus(wizardId: number): Promise<CommissionTierStatus> {
    const config = await this.configRepository.findOne({ where: { id: 1 } });
    const defaultFee = this.getDefaultFee();

    const tiers = config
      ? await this.tierRepository.find({
          where: { configId: config.id },
          order: { sortOrder: 'ASC' },
        })
      : [];

    if (!config || !tiers.length) {
      return {
        meetingsInWindow: 0,
        windowDays: config?.windowDays ?? 90,
        currentTier: {
          feePercent: defaultFee,
          minMeetings: 0,
          maxMeetings: null,
        },
        nextTier: null,
        platformFeePercent: defaultFee,
      };
    }

    const meetings = await this.countCompletedMeetingsInWindow(
      wizardId,
      config.windowDays,
    );

    let currentTier: TierInfo = {
      feePercent: defaultFee,
      minMeetings: 0,
      maxMeetings: null,
    };
    let nextTier: TierInfo | null = null;

    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const inRange =
        meetings >= tier.minMeetings &&
        (tier.maxMeetings == null || meetings <= tier.maxMeetings);
      if (inRange) {
        currentTier = {
          feePercent: tier.feePercent,
          minMeetings: tier.minMeetings,
          maxMeetings: tier.maxMeetings,
        };
        if (i + 1 < tiers.length) {
          const next = tiers[i + 1];
          nextTier = {
            feePercent: next.feePercent,
            minMeetings: next.minMeetings,
            maxMeetings: next.maxMeetings,
          };
        }
        break;
      }
      if (meetings < tier.minMeetings && !nextTier) {
        nextTier = {
          feePercent: tier.feePercent,
          minMeetings: tier.minMeetings,
          maxMeetings: tier.maxMeetings,
        };
        break;
      }
    }

    return {
      meetingsInWindow: meetings,
      windowDays: config.windowDays,
      currentTier,
      nextTier,
      platformFeePercent: currentTier.feePercent,
    };
  }
}
