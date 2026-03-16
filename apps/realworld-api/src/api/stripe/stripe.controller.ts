import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@repo/nest-common';
import { CurrentUser } from '@repo/api';
import { ApiAuth } from '@repo/api/decorators/http.decorators';
import { StripeService } from './stripe.service';

@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: any) {
    await this.stripeService.handleWebhook(req);
    return { received: true };
  }

  @Post('verify-session')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifySession(@Body() body: { sessionId: string }) {
    return this.stripeService.verifySession(body.sessionId);
  }

  @Post('payment-intent')
  @ApiAuth({ summary: 'Utwórz Stripe PaymentIntent do płatności wbudowanej' })
  @HttpCode(HttpStatus.OK)
  async createPaymentIntent(
    @CurrentUser('id') userId: number,
    @Body() body: { appointmentId: number },
  ) {
    return this.stripeService.createPaymentIntent(body.appointmentId, userId);
  }

  @Post('verify-payment-intent')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyPaymentIntent(@Body() body: { paymentIntentId: string }) {
    return this.stripeService.verifyPaymentIntent(body.paymentIntentId);
  }

  // ── Stripe Connect ──

  @Get('connect/quick-check')
  @ApiAuth({ summary: 'Szybkie sprawdzenie czy wróżka ma aktywne Stripe Connect' })
  async connectQuickCheck(@CurrentUser('id') userId: number) {
    return this.stripeService.quickCheckConnect(userId);
  }

  @Post('connect/account-session')
  @ApiAuth({ summary: 'Utwórz AccountSession do wbudowanego onboardingu Connect' })
  @HttpCode(HttpStatus.OK)
  async createAccountSession(
    @CurrentUser('id') userId: number,
    @CurrentUser('email') email: string,
  ) {
    return this.stripeService.createAccountSession(userId, email);
  }

  @Post('connect/refresh-status')
  @ApiAuth({ summary: 'Odśwież status konta Stripe Connect z API Stripe' })
  @HttpCode(HttpStatus.OK)
  async refreshStatus(@CurrentUser('id') userId: number) {
    await this.stripeService.refreshConnectStatus(userId);
    const status = await this.stripeService.getConnectAccountStatus(userId);
    const stripeAvail = status.stripeAvailableGrosze ?? 0;
    const stripePending = status.stripePendingGrosze ?? 0;
    return { ...status, withdrawableGrosze: stripeAvail, stripeTotalGrosze: stripeAvail + stripePending };
  }

  @Post('connect/onboard')
  @ApiAuth({ summary: 'Rozpocznij onboarding Stripe Connect dla wróżki' })
  async connectOnboard(
    @CurrentUser('id') userId: number,
    @CurrentUser('email') email: string,
  ) {
    return this.stripeService.getOrCreateConnectAccount(userId, email);
  }

  @Get('connect/status')
  @ApiAuth({ summary: 'Status konta Stripe Connect' })
  async connectStatus(@CurrentUser('id') userId: number) {
    const status = await this.stripeService.getConnectAccountStatus(userId);
    const stripeAvail = status.stripeAvailableGrosze ?? 0;
    const stripePending = status.stripePendingGrosze ?? 0;
    // Dostępne do wypłaty = saldo available w Stripe (źródło prawdy)
    return { ...status, withdrawableGrosze: stripeAvail, stripeTotalGrosze: stripeAvail + stripePending };
  }

  @Post('connect/withdraw')
  @ApiAuth({ summary: 'Wystąp o wypłatę na połączone konto Stripe' })
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @CurrentUser('id') userId: number,
    @Body() body: { amountGrosze: number },
  ) {
    const withdrawal = await this.stripeService.createWithdrawal(
      userId,
      body.amountGrosze,
    );
    return {
      id: withdrawal.id,
      amountGrosze: Number(withdrawal.amountGrosze),
      amountFormatted: `${(Number(withdrawal.amountGrosze) / 100).toFixed(2)} zł`,
      status: withdrawal.status,
      stripeTransferId: withdrawal.stripeTransferId,
      createdAt: withdrawal.createdAt,
    };
  }

  @Get('connect/withdrawals')
  @ApiAuth({ summary: 'Lista moich wypłat' })
  async getWithdrawals(
    @CurrentUser('id') userId: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.stripeService.getWithdrawals(
      userId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
    return {
      withdrawals: result.withdrawals.map((w) => ({
        id: w.id,
        amountGrosze: Number(w.amountGrosze),
        amountFormatted: `${(Number(w.amountGrosze) / 100).toFixed(2)} zł`,
        status: w.status,
        stripeTransferId: w.stripeTransferId,
        createdAt: w.createdAt,
      })),
      total: result.total,
    };
  }
}
