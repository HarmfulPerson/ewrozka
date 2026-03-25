import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiPublic, ApiAuth } from '@repo/api/decorators/http.decorators';
import { CurrentUser } from '@repo/api';
import { ApiTags } from '@nestjs/swagger';
import { GuestBookingService } from './guest-booking.service';
import { CreateGuestBookingDto } from './guest-booking.service';

@ApiTags('GuestBooking')
@Controller()
export class GuestBookingController {
  constructor(private readonly service: GuestBookingService) {}

  /** Gość tworzy wniosek o spotkanie – endpoint publiczny */
  @Post('guest-bookings')
  @HttpCode(HttpStatus.CREATED)
  @ApiPublic({ summary: 'Create guest booking' })
  async create(@Body() dto: CreateGuestBookingDto): Promise<{ id: string }> {
    return this.service.create(dto);
  }

  /** Szczegóły rezerwacji dla strony płatności gościa */
  @Get('guest-bookings/:id/details')
  @ApiPublic({ summary: 'Get guest booking details (for payment page)' })
  async getDetails(@Param('id') bookingId: string) {
    return this.service.getBookingDetails(bookingId);
  }

  /** Gość inicjuje płatność – zwraca clientSecret do wbudowanego formularza */
  @Post('guest-bookings/:id/payment-intent')
  @ApiPublic({ summary: 'Create Stripe PaymentIntent for guest booking' })
  async paymentIntent(@Param('id') bookingId: string): Promise<{ clientSecret: string }> {
    return this.service.createPaymentIntent(bookingId);
  }

  /** Weryfikacja płatności gościa (polling z frontu) */
  @Post('guest-bookings/verify-payment')
  @ApiPublic({ summary: 'Verify guest payment intent' })
  async verifyPayment(@Body('paymentIntentId') paymentIntentId: string): Promise<{ success: boolean }> {
    return this.service.verifyPaymentIntent(paymentIntentId);
  }

  /** Gość inicjuje płatność – zwraca URL Stripe Checkout (fallback) */
  @Post('guest-bookings/:id/pay')
  @ApiPublic({ summary: 'Create Stripe payment session for guest booking' })
  async pay(@Param('id') bookingId: string): Promise<{ url: string }> {
    return this.service.createPaymentSession(bookingId);
  }

  /** Pokój spotkania dla gościa (po opłaceniu) */
  @Get('guest-bookings/room/:guestToken')
  @ApiPublic({ summary: 'Get guest meeting room' })
  async getRoom(@Param('guestToken') guestToken: string) {
    return this.service.getMeetingRoom(guestToken);
  }

  /** Wróżka: lista wniosków gości */
  @Get('wizard/guest-bookings')
  @ApiAuth({ summary: 'Wizard: list guest bookings' })
  async listForWizard(
    @CurrentUser('id') wizardId: number,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    const parsedLimit = parseInt(limit ?? '50', 10) || 50;
    const parsedOffset = parseInt(offset ?? '0', 10) || 0;

    return this.service.getForWizard(wizardId, {
      status,
      limit: parsedLimit,
      offset: parsedOffset,
      sortBy,
      order,
    });
  }

  /** Wróżka: akceptacja wniosku */
  @Post('wizard/guest-bookings/:id/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuth({ summary: 'Wizard: accept guest booking' })
  async accept(
    @CurrentUser('id') wizardId: number,
    @Param('id') bookingId: string,
  ): Promise<void> {
    await this.service.accept(wizardId, bookingId);
  }

  /** Wróżka: pokój spotkania dla opłaconej rezerwacji gościa */
  @Get('wizard/guest-bookings/:id/meeting-room')
  @ApiAuth({ summary: 'Wizard: get meeting room for paid guest booking' })
  async getWizardMeetingRoom(
    @CurrentUser('id') wizardId: number,
    @Param('id') bookingId: string,
  ) {
    return this.service.getWizardMeetingRoom(wizardId, bookingId);
  }

  /** Wróżka: odrzucenie wniosku */
  @Post('wizard/guest-bookings/:id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuth({ summary: 'Wizard: reject guest booking' })
  async reject(
    @CurrentUser('id') wizardId: number,
    @Param('id') bookingId: string,
    @Body('reason') reason?: string,
  ): Promise<void> {
    await this.service.reject(wizardId, bookingId, reason);
  }
}
