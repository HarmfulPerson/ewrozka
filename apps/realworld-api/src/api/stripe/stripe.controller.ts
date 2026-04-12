import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@repo/nest-common';
import { CurrentUser } from '@repo/api';
import { ApiAuth } from '@repo/api/decorators/http.decorators';
import { StripeService } from './stripe.service';

@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
  ) {}

  @Post('webhook')
  @Public()
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: any) {
    await this.stripeService.handleWebhook(req);
    return { received: true };
  }

  @Post('verify-session')
  @Public()
  @Throttle({ short: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async verifySession(@Body() body: { sessionId: string }) {
    return this.stripeService.verifySession(body.sessionId);
  }

  @Post('payment-intent')
  @ApiAuth({ summary: 'Utwórz Stripe PaymentIntent do płatności wbudowanej' })
  @HttpCode(HttpStatus.OK)
  async createPaymentIntent(
    @CurrentUser('id') userId: string,
    @Body() body: { appointmentUid?: string },
  ) {
    if (!body.appointmentUid) {
      throw new BadRequestException('Brak appointmentUid');
    }
    return this.stripeService.createPaymentIntent(body.appointmentUid, userId);
  }

  @Post('verify-payment-intent')
  @Public()
  @Throttle({ short: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async verifyPaymentIntent(@Body() body: { paymentIntentId: string }) {
    return this.stripeService.verifyPaymentIntent(body.paymentIntentId);
  }

  // ── Stripe Connect ──

  @Get('connect/quick-check')
  @ApiAuth({ summary: 'Szybkie sprawdzenie czy specjalista ma aktywne Stripe Connect' })
  async connectQuickCheck(@CurrentUser('id') userId: string) {
    return this.stripeService.quickCheckConnect(userId);
  }

  @Post('connect/account-session')
  @ApiAuth({ summary: 'Utwórz AccountSession do wbudowanego onboardingu Connect' })
  @HttpCode(HttpStatus.OK)
  async createAccountSession(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') email: string,
  ) {
    return this.stripeService.createAccountSession(userId, email);
  }

  @Post('connect/refresh-status')
  @ApiAuth({ summary: 'Odśwież status konta Stripe Connect z API Stripe' })
  @HttpCode(HttpStatus.OK)
  async refreshStatus(@CurrentUser('id') userId: string) {
    await this.stripeService.refreshConnectStatus(userId);
    const status = await this.stripeService.getConnectAccountStatus(userId);
    const stripeAvail = status.stripeAvailableGrosze ?? 0;
    const stripePending = status.stripePendingGrosze ?? 0;
    return { ...status, withdrawableGrosze: stripeAvail, stripeTotalGrosze: stripeAvail + stripePending };
  }

  @Post('connect/onboard')
  @ApiAuth({ summary: 'Rozpocznij onboarding Stripe Connect dla specjalisty' })
  async connectOnboard(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') email: string,
  ) {
    return this.stripeService.getOrCreateConnectAccount(userId, email);
  }

  @Get('connect/status')
  @ApiAuth({ summary: 'Status konta Stripe Connect' })
  async connectStatus(@CurrentUser('id') userId: string) {
    const status = await this.stripeService.getConnectAccountStatus(userId);
    const stripeAvail = status.stripeAvailableGrosze ?? 0;
    const stripePending = status.stripePendingGrosze ?? 0;
    // Dostępne do wypłaty = saldo available w Stripe (źródło prawdy)
    return { ...status, withdrawableGrosze: stripeAvail, stripeTotalGrosze: stripeAvail + stripePending };
  }

  @Post('connect/withdraw')
  @ApiAuth({ summary: 'Wystąp o wypłatę na połączone konto Stripe' })
  @Throttle({ short: { ttl: 60_000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @CurrentUser('id') userId: string,
    @Body() body: { amountGrosze: number },
  ) {
    const withdrawal = await this.stripeService.createWithdrawal(
      userId,
      body.amountGrosze,
    );
    return {
      uid: withdrawal.uid,
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
    @CurrentUser('id') userId: string,
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
        uid: w.uid,
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
