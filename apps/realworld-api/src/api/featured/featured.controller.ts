import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@repo/api';
import { ApiAuth, ApiPublic } from '@repo/api/decorators/http.decorators';
import { FeaturedService } from './featured.service';

@ApiTags('Featured')
@Controller('featured')
export class FeaturedController {
  constructor(private readonly featuredService: FeaturedService) {}

  /** Zwraca konfigurację wyróżnienia (cena, czas trwania) – publiczne */
  @Get('config')
  @ApiPublic({ summary: 'Konfiguracja wyróżnienia (cena, czas trwania)' })
  getConfig() {
    return this.featuredService.getFeaturedConfig();
  }

  /** Sprawdza status wyróżnienia zalogowanej wróżki */
  @Get('my-status')
  @ApiAuth({ summary: 'Status wyróżnienia zalogowanej wróżki' })
  async getMyStatus(@CurrentUser('id') userId: number) {
    return this.featuredService.getWizardFeaturedStatus(userId);
  }

  /** Tworzy Stripe PaymentIntent dla wyróżnienia (inline Payment Element) */
  @Post('payment-intent')
  @ApiAuth({ summary: 'Utwórz Stripe PaymentIntent dla wyróżnienia wróżki' })
  @HttpCode(HttpStatus.OK)
  async paymentIntent(
    @CurrentUser('id') userId: number,
    @CurrentUser('email') email: string,
  ) {
    return this.featuredService.createFeaturedPaymentIntent(userId, email);
  }

  /** Weryfikuje PaymentIntent wyróżnienia i aktywuje je jeśli opłacone */
  @Post('verify-payment')
  @ApiPublic({ summary: 'Weryfikacja i aktywacja wyróżnienia po płatności' })
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Body() body: { paymentIntentId: string }) {
    return this.featuredService.verifyFeaturedPaymentIntent(body.paymentIntentId);
  }

  /** Webhook – wywoływany przez StripeService po pomyślnej płatności */
  @Post('activate')
  @ApiPublic({ summary: 'Wewnętrzny – aktywacja wyróżnienia po płatności (przez StripeService)' })
  @HttpCode(HttpStatus.OK)
  async activate(
    @Body() body: { wizardId: number; paymentIntentId: string | null; durationHours: number },
  ) {
    await this.featuredService.activateFeatured(
      body.wizardId,
      body.paymentIntentId,
      body.durationHours,
    );
    return { activated: true };
  }
}
