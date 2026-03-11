import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  WalletEntity,
  TransactionEntity,
  PlatformRevenueEntity,
} from '@repo/postgresql-typeorm';
import { DataSource, Repository } from 'typeorm';
import { AllConfigType } from '@/config/config.type';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(PlatformRevenueEntity)
    private readonly platformRevenueRepository: Repository<PlatformRevenueEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async processPayment(
    wrozkaId: number,
    appointmentId: number,
    totalAmountGrosze: number,
  ): Promise<{ transaction: TransactionEntity; wizardBalance: number }> {
    this.logger.log(
      `Processing payment for wizard ${wrozkaId}, appointment ${appointmentId}, amount ${totalAmountGrosze}gr`,
    );

    const platformFeePercentage = this.configService.get(
      'payment.platformFeePercentage',
      { infer: true },
    );

    this.logger.log(`Platform fee percentage: ${platformFeePercentage}%`);

    // Calculate amounts
    const platformFeeGrosze = Math.floor(
      (totalAmountGrosze * platformFeePercentage) / 100,
    );
    const wizardAmountGrosze = totalAmountGrosze - platformFeeGrosze;

    this.logger.log(
      `Calculated: Platform fee: ${platformFeeGrosze}gr, Wizard amount: ${wizardAmountGrosze}gr`,
    );

    // Use transaction to ensure atomicity
    return await this.dataSource.transaction(async (manager) => {
      // Find or create wallet for wizard
      let wallet = await manager.findOne(WalletEntity, {
        where: { userId: wrozkaId },
      });

      this.logger.log(`Wallet found: ${!!wallet}`);

      if (!wallet) {
        this.logger.log(`Creating new wallet for wizard ${wrozkaId}`);
        wallet = manager.create(WalletEntity, {
          userId: wrozkaId,
          balance: 0,
          currency: 'PLN',
        });
      }

      const oldBalance = Number(wallet.balance);
      // Update wallet balance
      wallet.balance = Number(wallet.balance) + wizardAmountGrosze;
      await manager.save(WalletEntity, wallet);

      this.logger.log(
        `Wallet balance updated: ${oldBalance}gr -> ${wallet.balance}gr`,
      );

      // Create transaction record
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

      this.logger.log(`Transaction created with ID: ${transaction.id}`);

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
      revenue.totalWizardPayouts =
        Number(revenue.totalWizardPayouts) + wizardAmountGrosze;
      revenue.totalVolume = Number(revenue.totalVolume) + totalAmountGrosze;
      revenue.transactionCount = Number(revenue.transactionCount) + 1;
      await manager.save(PlatformRevenueEntity, revenue);

      this.logger.log(
        `Payment processed: ${totalAmountGrosze}gr, Platform: ${platformFeeGrosze}gr (${platformFeePercentage}%), Wizard: ${wizardAmountGrosze}gr`,
      );

      return {
        transaction,
        wizardBalance: Number(wallet.balance),
      };
    });
  }

  async recordDestinationCharge(
    wrozkaId: number,
    appointmentId: number,
    totalAmountGrosze: number,
  ): Promise<void> {
    const platformFeePercentage = this.configService.get(
      'payment.platformFeePercentage',
      { infer: true },
    );
    const platformFeeGrosze = Math.floor(
      (totalAmountGrosze * platformFeePercentage) / 100,
    );
    const wizardAmountGrosze = totalAmountGrosze - platformFeeGrosze;

    // Rejestruj transakcję dla historii — pieniądze już u wróżki przez Stripe
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
      `Destination charge recorded: ${totalAmountGrosze}gr, Platform: ${platformFeeGrosze}gr, Wizard via Stripe: ${wizardAmountGrosze}gr`,
    );
  }

  async getWalletBalance(userId: number): Promise<number> {
    this.logger.log(`Fetching wallet balance for user ${userId}`);
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });
    this.logger.log(`Wallet found: ${!!wallet}, balance: ${wallet ? wallet.balance : 0}gr`);
    return wallet ? Number(wallet.balance) : 0;
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
