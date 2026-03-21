import { AllConfigType } from '@/config/config.type';

import { Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { InjectRepository } from '@nestjs/typeorm';

import { PlatformRevenueEntity, TransactionEntity, UserEntity } from '@repo/postgresql-typeorm';

import { DataSource, Repository } from 'typeorm';

import { CommissionTierService, type CommissionTierStatus } from './commission-tier.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,

    @InjectRepository(PlatformRevenueEntity)
    private readonly platformRevenueRepository: Repository<PlatformRevenueEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    private readonly dataSource: DataSource,

    private readonly configService: ConfigService<AllConfigType>,

    private readonly commissionTierService: CommissionTierService,
  ) {}

  async processPayment(
    wrozkaId: number,

    appointmentId: number,

    totalAmountGrosze: number,

    platformFeePercentOverride?: number,
  ): Promise<{ transaction: TransactionEntity }> {
    this.logger.log(
      `Przetwarzanie płatności dla specjalisty ${wrozkaId}, wizyta ${appointmentId}, kwota ${totalAmountGrosze}gr`,
    );

    const platformFeePercentage =
      platformFeePercentOverride ??
      this.configService.get('payment.platformFeePercentage', {
        infer: true,
      }) ??
      20;

    this.logger.log(`Procent prowizji platformy: ${platformFeePercentage}%`);

    const platformFeeGrosze = Math.floor((totalAmountGrosze * platformFeePercentage) / 100);

    const wizardAmountGrosze = totalAmountGrosze - platformFeeGrosze;

    this.logger.log(`Obliczono: Prowizja platformy: ${platformFeeGrosze}gr, Kwota specjalisty: ${wizardAmountGrosze}gr`);

    return await this.dataSource.transaction(async (manager) => {
      const transaction = manager.create(TransactionEntity, {
        userId: wrozkaId,

        appointmentId,

        totalAmount: totalAmountGrosze,

        platformFee: platformFeeGrosze,

        wizardAmount: wizardAmountGrosze,

        type: 'payment',

        status: 'completed',
      });

      await manager.save(TransactionEntity, transaction);

      this.logger.log(`Transakcja utworzona, ID: ${transaction.id}`);

      // Update platform revenue for today

      const today = new Date().toISOString().split('T')[0];

      let revenue = await manager.findOne(PlatformRevenueEntity, {
        where: { date: today },
      });

      if (!revenue) {
        revenue = manager.create(PlatformRevenueEntity, {
          date: today,

          totalFees: 0,

          totalWizardPayouts: 0,

          totalVolume: 0,

          transactionCount: 0,
        });
      }

      revenue.totalFees = Number(revenue.totalFees) + platformFeeGrosze;

      revenue.totalWizardPayouts = Number(revenue.totalWizardPayouts) + wizardAmountGrosze;

      revenue.totalVolume = Number(revenue.totalVolume) + totalAmountGrosze;

      revenue.transactionCount = Number(revenue.transactionCount) + 1;

      await manager.save(PlatformRevenueEntity, revenue);

      this.logger.log(
        `Płatność przetworzona: ${totalAmountGrosze}gr, Platforma: ${platformFeeGrosze}gr (${platformFeePercentage}%), Specjalista: ${wizardAmountGrosze}gr`,
      );

      return { transaction };
    });
  }

  async recordDestinationCharge(
    wrozkaId: number,

    appointmentId: number,

    totalAmountGrosze: number,

    platformFeePercentOverride?: number,
  ): Promise<void> {
    const platformFeePercentage =
      platformFeePercentOverride ??
      this.configService.get('payment.platformFeePercentage', {
        infer: true,
      }) ??
      20;

    const platformFeeGrosze = Math.floor((totalAmountGrosze * platformFeePercentage) / 100);

    const wizardAmountGrosze = totalAmountGrosze - platformFeeGrosze;

    // Rejestruj transakcję dla historii — pieniądze trafiają do wróżki przez Stripe

    await this.dataSource.transaction(async (manager) => {
      const transaction = manager.create(TransactionEntity, {
        userId: wrozkaId,

        appointmentId,

        totalAmount: totalAmountGrosze,

        platformFee: platformFeeGrosze,

        wizardAmount: wizardAmountGrosze,

        type: 'destination_charge',

        status: 'completed',
      });

      await manager.save(TransactionEntity, transaction);

      // Zaktualizuj przychody platformy

      const today = new Date().toISOString().split('T')[0];

      let revenue = await manager.findOne(PlatformRevenueEntity, {
        where: { date: today },
      });

      if (!revenue) {
        revenue = manager.create(PlatformRevenueEntity, {
          date: today,

          totalFees: 0,

          totalWizardPayouts: 0,

          totalVolume: 0,

          transactionCount: 0,
        });
      }

      revenue.totalFees = Number(revenue.totalFees) + platformFeeGrosze;

      revenue.totalWizardPayouts = Number(revenue.totalWizardPayouts) + wizardAmountGrosze;

      revenue.totalVolume = Number(revenue.totalVolume) + totalAmountGrosze;

      revenue.transactionCount = Number(revenue.transactionCount) + 1;

      await manager.save(PlatformRevenueEntity, revenue);
    });

    this.logger.log(
      `Zarejestrowano płatność (destination charge): ${totalAmountGrosze}gr, Platforma: ${platformFeeGrosze}gr, Specjalista przez Stripe: ${wizardAmountGrosze}gr`,
    );
  }

  async getPlatformFeePercentForUser(userId: number): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },

      select: ['id', 'platformFeePercent'],
    });

    if (user?.platformFeePercent !== null && user?.platformFeePercent !== undefined) {
      return user.platformFeePercent;
    }

    return this.commissionTierService.getEffectiveFeePercent(userId);
  }

  async getCommissionTierStatus(userId: number): Promise<CommissionTierStatus> {
    const [user, tierStatus] = await Promise.all([
      this.userRepository.findOne({
        where: { id: userId },

        select: ['id', 'platformFeePercent'],
      }),

      this.commissionTierService.getTierStatus(userId),
    ]);

    // platformFeePercent musi być jawnie ustawione (nie null, nie undefined, nie 0 z domyślnej migracji)
    const adminOverride = user?.platformFeePercent;
    const isSetByAdmin = adminOverride !== null && adminOverride !== undefined;

    return {
      ...tierStatus,

      platformFeePercent: isSetByAdmin ? adminOverride : tierStatus.platformFeePercent,

      isSetByAdmin,
    };
  }

  async getTransactionHistory(
    userId: number,

    limit: number = 50,

    offset: number = 0,

    sortBy: 'date' | 'amount' = 'date',

    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<{ transactions: TransactionEntity[]; total: number }> {
    const orderField = sortBy === 'amount' ? 'wizardAmount' : 'createdAt';

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { userId },

      relations: ['appointment', 'appointment.advertisement'],

      order: { [orderField]: sortOrder },

      take: limit,

      skip: offset,
    });

    return { transactions, total };
  }

  async getPlatformRevenue(
    fromDate?: string,

    toDate?: string,
  ): Promise<PlatformRevenueEntity[]> {
    const query = this.platformRevenueRepository.createQueryBuilder('revenue');

    if (fromDate) {
      query.andWhere('revenue.date >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('revenue.date <= :toDate', { toDate });
    }

    query.orderBy('revenue.date', 'DESC');

    return await query.getMany();
  }
}
