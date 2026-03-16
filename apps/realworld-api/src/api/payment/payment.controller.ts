import { Controller, Get, Query } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@repo/api';

import { ApiAuth } from '@repo/api/decorators/http.decorators';

import { PaymentService } from './payment.service';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('wallet')
  @ApiAuth({ summary: 'Moje saldo portfela' })
  async getWalletBalance(@CurrentUser('id') userId: number) {
    const [balance, platformFeePercent, commissionTierStatus] = await Promise.all([
      this.paymentService.getEarnedBalance(userId),

      this.paymentService.getPlatformFeePercentForUser(userId),

      this.paymentService.getCommissionTierStatus(userId),
    ]);

    return {
      balance,

      currency: 'PLN',

      balanceFormatted: `${(balance / 100).toFixed(2)} zł`,

      platformFeePercent,

      commissionTier: commissionTierStatus,
    };
  }

  @Get('transactions')
  @ApiAuth({ summary: 'Historia moich transakcji' })
  async getTransactions(
    @CurrentUser('id') userId: number,

    @Query('limit') limit?: string,

    @Query('offset') offset?: string,

    @Query('sortBy') sortBy?: string,

    @Query('sortOrder') sortOrder?: string,
  ) {
    const validSortBy = sortBy === 'amount' ? 'amount' : 'date';

    const validSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const result = await this.paymentService.getTransactionHistory(
      userId,

      limit ? parseInt(limit, 10) : 50,

      offset ? parseInt(offset, 10) : 0,

      validSortBy,

      validSortOrder,
    );

    return {
      transactions: result.transactions.map((t) => ({
        id: t.id,

        appointmentId: t.appointmentId ?? null,

        advertisementTitle: t.appointment?.advertisement?.title ?? null,

        totalAmount: Number(t.totalAmount),

        platformFee: Number(t.platformFee),

        wizardAmount: Number(t.wizardAmount),

        type: t.type,

        status: t.status,

        createdAt: t.createdAt.toISOString(),
      })),

      total: result.total,
    };
  }
}
