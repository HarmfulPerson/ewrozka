import { AllConfigType } from '@/config/config.type';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  GuestBookingEntity,
  StripeConnectAccountEntity,
  UserEntity,
} from '@repo/postgresql-typeorm';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { In, Repository } from 'typeorm';
import { AvailabilityService } from '../availability/availability.service';
import { EmailType } from '../email/email-type.enum';
import { EmailService } from '../email/email.service';
import { DailyCoService } from '../meeting-room/daily-co.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildMeetingPaidNotification, buildNewRequestNotification } from '../notifications/handlers';
import { PaymentService } from '../payment/payment.service';

export interface CreateGuestBookingDto {
  advertisementId: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  message?: string;
  scheduledAt: string; // ISO string
}

@Injectable()
export class GuestBookingService {
  private readonly logger = new Logger(GuestBookingService.name);
  private readonly stripe: Stripe;
  private readonly currency: string;

  constructor(
    @InjectRepository(GuestBookingEntity)
    private readonly bookingRepo: Repository<GuestBookingEntity>,
    @InjectRepository(AdvertisementEntity)
    private readonly adRepo: Repository<AdvertisementEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(StripeConnectAccountEntity)
    private readonly connectAccountRepo: Repository<StripeConnectAccountEntity>,
    private readonly availabilityService: AvailabilityService,
    private readonly emailService: EmailService,
    private readonly dailyCo: DailyCoService,
    private readonly config: ConfigService<AllConfigType>,
    private readonly notificationsService: NotificationsService,
    private readonly paymentService: PaymentService,
  ) {
    this.stripe = new Stripe(
      this.config.get('stripe.secretKey', { infer: true })!,
    );
    this.currency = this.config.get('stripe.currency', { infer: true }) ?? 'pln';
  }

  private get paymentMethods(): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
    return this.currency === 'pln' ? ['card', 'blik', 'p24'] : ['card'];
  }

  // ── Tworzenie rezerwacji przez gościa ──────────────────────────────────────

  async create(dto: CreateGuestBookingDto): Promise<{ id: string }> {
    const ad = await this.adRepo.findOne({
      where: { id: dto.advertisementId },
    });
    if (!ad) throw new NotFoundException('Ogłoszenie nie istnieje');

    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime()))
      throw new BadRequestException('Nieprawidłowa data');
    if (scheduledAt < new Date())
      throw new BadRequestException(
        'Nie można zarezerwować terminu w przeszłości',
      );

    const guestEmail = dto.guestEmail.trim().toLowerCase();
    const existing = await this.bookingRepo.findOne({
      where: {
        guestEmail,
        advertisementId: ad.id,
        scheduledAt,
        status: In(['pending', 'accepted']),
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Masz już rezerwację na ten termin. Poczekaj na odpowiedź specjalisty lub wybierz inny slot.',
      );
    }

    const booking = this.bookingRepo.create({
      wizardId: ad.userId,
      advertisementId: ad.id,
      guestName: dto.guestName.trim(),
      guestEmail: dto.guestEmail.trim().toLowerCase(),
      guestPhone: dto.guestPhone?.trim() ?? null,
      message: dto.message?.trim() ?? null,
      scheduledAt,
      durationMinutes: ad.durationMinutes,
      priceGrosze: ad.priceGrosze,
      status: 'pending',
    });

    await this.bookingRepo.save(booking);
    this.logger.log(
      `Guest booking created: ${booking.id} for wizard ${ad.userId}`,
    );

    // Powiadom wróżkę przez WebSocket o nowym wniosku gościa
    void this.notificationsService.notifyWizard(ad.userId);

    void this.notificationsService.createAndEmit(
      buildNewRequestNotification({
        wizardId: ad.userId,
        clientName: dto.guestName,
        advertisementTitle: ad.title,
        requestId: booking.id,
        isGuest: true,
      }),
    );

    return { id: booking.id };
  }

  // ── Wróżka: lista wniosków ─────────────────────────────────────────────────

  async getForWizard(
    wizardId: number,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      order?: string;
    } = {},
  ) {
    const {
      status,
      limit = 50,
      offset = 0,
      sortBy: rawSortBy,
      order: rawOrder,
    } = options;

    const allowedSortBy = ['createdAt', 'scheduledAt', 'status', 'guestName'];
    const sortBy = allowedSortBy.includes(rawSortBy ?? '')
      ? (rawSortBy as string)
      : 'createdAt';

    const allowedOrder = ['ASC', 'DESC'];
    const order = allowedOrder.includes(rawOrder?.toUpperCase() ?? '')
      ? (rawOrder!.toUpperCase() as 'ASC' | 'DESC')
      : 'DESC';

    const where: any = { wizardId };

    if (status) {
      where.status =
        status === 'accepted' ? In(['accepted', 'paid']) : status;
    }

    const [bookings, total] = await this.bookingRepo.findAndCount({
      where,
      relations: ['advertisement'],
      order: { [sortBy]: order },
      take: limit,
      skip: offset,
    });

    return { bookings: bookings.map((b) => this.toRowDto(b)), total };
  }

  // ── Wróżka: akceptacja ────────────────────────────────────────────────────

  async accept(wizardId: number, bookingId: string): Promise<void> {
    const booking = await this.findOwned(wizardId, bookingId);
    if (booking.status !== 'pending')
      throw new BadRequestException('Wniosek nie jest w stanie oczekującym');

    const occupied = await this.availabilityService.isSlotOccupied(
      wizardId,
      booking.scheduledAt,
      booking.durationMinutes,
    );
    if (occupied) {
      throw new BadRequestException(
        'Ten termin jest już zajęty. Ktoś inny został w tym czasie zaakceptowany.',
      );
    }

    booking.status = 'accepted';
    await this.bookingRepo.save(booking);

    void this.notificationsService.notifyWizard(wizardId);

    const wizard = await this.userRepo.findOne({ where: { id: wizardId } });
    const appUrl =
      this.config.get('stripe.frontendUrl', { infer: true }) ??
      'http://localhost:4000';
    const paymentPageUrl = `${appUrl}/platnosc/gosc/${booking.id}`;
    const scheduledPl = booking.scheduledAt.toLocaleString('pl-PL', {
      timeZone: 'Europe/Warsaw',
    });

    await this.emailService.send({
      to: booking.guestEmail,
      subject: 'Twój wniosek o spotkanie został zaakceptowany – opłać wizytę',
      type: EmailType.GUEST_BOOKING_ACCEPTED,
      context: {
        guestName: booking.guestName,
        wizardName: wizard?.username ?? 'Specjalista',
        scheduledAt: scheduledPl,
        durationMinutes: booking.durationMinutes,
        priceZl: (booking.priceGrosze / 100).toFixed(2),
        paymentUrl: paymentPageUrl,
        appUrl,
      },
    });
  }

  // ── Payment Intent dla wbudowanego formularza (wywoływane ze strony gościa) ──

  async createPaymentIntent(
    bookingId: string,
  ): Promise<{ clientSecret: string }> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['advertisement', 'wizard'],
    });
    if (!booking) throw new NotFoundException('Rezerwacja nie istnieje');
    if (booking.status !== 'accepted')
      throw new BadRequestException(
        'Rezerwacja nie jest w stanie oczekującym na płatność',
      );

    const ad = booking.advertisement;
    const wizard = booking.wizard;

    // Sprawdź czy wróżka ma aktywne Stripe Connect
    const connectAccount = await this.connectAccountRepo.findOne({
      where: { userId: booking.wizardId },
    });
    const hasActiveConnect = !!(connectAccount?.onboardingCompleted && connectAccount?.payoutsEnabled);

    const platformFeePercentage = await this.paymentService.getPlatformFeePercentForUser(booking.wizardId);
    const platformFeeGrosze = Math.floor((booking.priceGrosze * platformFeePercentage) / 100);

    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount: booking.priceGrosze,
      currency: this.currency,
      payment_method_types: this.paymentMethods,
      description: `${ad?.title ?? 'Konsultacja'} ze ${wizard?.username ?? 'specjalistą'}`,
      metadata: {
        bookingType: 'guest',
        guestBookingId: booking.id,
        wizardId: String(booking.wizardId),
        priceGrosze: String(booking.priceGrosze),
        platformFeePercent: String(platformFeePercentage),
        isDestinationCharge: hasActiveConnect ? 'true' : 'false',
      },
    };

    if (hasActiveConnect) {
      intentParams.application_fee_amount = platformFeeGrosze;
      intentParams.transfer_data = {
        destination: connectAccount!.stripeAccountId,
      };
      this.logger.log(
        `Guest PaymentIntent (destination): ${booking.priceGrosze}gr → ${connectAccount!.stripeAccountId}, prowizja: ${platformFeeGrosze}gr`,
      );
    }

    const intent = await this.stripe.paymentIntents.create(intentParams);

    return { clientSecret: intent.client_secret! };
  }

  // ── Weryfikacja płatności (polling z frontu gościa) ───────────────────────

  async verifyPaymentIntent(
    paymentIntentId: string,
  ): Promise<{ success: boolean }> {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (!intent || intent.status !== 'succeeded') return { success: false };

    const bookingId = intent.metadata?.guestBookingId;
    if (!bookingId) return { success: false };

    // Szukamy po id (UUID), NIE po stripeSessionId
    await this.handlePaymentSuccessById(bookingId);
    return { success: true };
  }

  // ── Tworzenie sesji Checkout (fallback – nieużywane w nowym flow) ─────────

  async createPaymentSession(bookingId: string): Promise<{ url: string }> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Rezerwacja nie istnieje');
    if (booking.status !== 'accepted')
      throw new BadRequestException(
        'Rezerwacja nie jest w stanie oczekującym na płatność',
      );
    return this.createCheckoutSession(booking);
  }

  // ── Szczegóły rezerwacji (dla strony płatności gościa) ────────────────────

  async getBookingDetails(bookingId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['advertisement', 'wizard'],
    });
    if (!booking) throw new NotFoundException('Rezerwacja nie istnieje');
    return {
      id: booking.id,
      guestName: booking.guestName,
      wizardName: booking.wizard?.username ?? 'Specjalista',
      advertisementTitle: booking.advertisement?.title ?? 'Konsultacja',
      scheduledAt: booking.scheduledAt,
      durationMinutes: booking.durationMinutes,
      priceGrosze: booking.priceGrosze,
      status: booking.status,
    };
  }

  // ── Wróżka: odrzucenie ────────────────────────────────────────────────────

  async reject(
    wizardId: number,
    bookingId: string,
    reason?: string,
  ): Promise<void> {
    const booking = await this.findOwned(wizardId, bookingId);
    if (!['pending', 'accepted'].includes(booking.status))
      throw new BadRequestException('Nie można odrzucić tego wniosku');

    booking.status = 'rejected';
    booking.rejectionReason = reason ?? null;
    await this.bookingRepo.save(booking);

    void this.notificationsService.notifyWizard(wizardId);

    const wizard = await this.userRepo.findOne({ where: { id: wizardId } });
    const appUrl =
      this.config.get('stripe.frontendUrl', { infer: true }) ??
      'http://localhost:4000';

    await this.emailService.send({
      to: booking.guestEmail,
      subject: 'Twój wniosek o spotkanie nie został zaakceptowany',
      type: EmailType.GUEST_BOOKING_REJECTED,
      context: {
        guestName: booking.guestName,
        wizardName: wizard?.username ?? 'Specjalista',
        rejectionReason: reason ?? null,
        appUrl,
      },
    });
  }

  // ── Webhook (Checkout Session): płatność opłacona ────────────────────────

  async handlePaymentSuccess(stripeSessionId: string): Promise<void> {
    const booking = await this.bookingRepo.findOne({
      where: { stripeSessionId },
    });
    if (!booking) {
      this.logger.warn(
        `Guest booking not found for session ${stripeSessionId}`,
      );
      return;
    }
    await this.markBookingAsPaid(booking);
  }

  // ── Webhook / polling (PaymentIntent): płatność opłacona ─────────────────

  async handlePaymentSuccessById(bookingId: string): Promise<void> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      this.logger.warn(`Guest booking not found for id ${bookingId}`);
      return;
    }
    await this.markBookingAsPaid(booking);
  }

  // ── Wspólna logika: oznacz jako opłacone + wyślij email ───────────────────

  private async markBookingAsPaid(booking: GuestBookingEntity): Promise<void> {
    if (booking.status === 'paid' || booking.status === 'completed') return;

    const guestToken = randomUUID();
    booking.status = 'paid';
    booking.guestToken = guestToken;
    await this.bookingRepo.save(booking);

    const wizard = await this.userRepo.findOne({
      where: { id: booking.wizardId },
    });
    const appUrl =
      this.config.get('stripe.frontendUrl', { infer: true }) ??
      'http://localhost:4000';
    const meetingUrl = `${appUrl}/guest/spotkanie/${guestToken}`;
    const scheduledPl = booking.scheduledAt.toLocaleString('pl-PL', {
      timeZone: 'Europe/Warsaw',
    });

    await this.emailService.send({
      to: booking.guestEmail,
      subject: 'Płatność potwierdzona – Twój link do spotkania',
      type: EmailType.GUEST_BOOKING_PAID,
      context: {
        guestName: booking.guestName,
        wizardName: wizard?.username ?? 'Specjalista',
        scheduledAt: scheduledPl,
        durationMinutes: booking.durationMinutes,
        meetingUrl,
        appUrl,
      },
    });

    // Powiadom wróżkę o opłaceniu spotkania przez gościa
    const advertisement = await this.adRepo.findOne({
      where: { id: booking.advertisementId ?? 0 },
    });
    void this.notificationsService.createAndEmit(
      buildMeetingPaidNotification({
        wizardId: booking.wizardId,
        clientName: booking.guestName,
        advertisementTitle: advertisement?.title ?? 'Konsultacja',
        appointmentId: 0,
        startsAt: booking.scheduledAt?.toISOString?.() ?? '',
      }),
    );

    this.logger.log(`Guest booking ${booking.id} paid, token: ${guestToken}`);
  }

  // ── Pokój spotkania dla gościa ────────────────────────────────────────────

  async getMeetingRoom(
    guestToken: string,
  ): Promise<{ roomUrl: string; token: string; booking: any }> {
    const booking = await this.bookingRepo.findOne({
      where: { guestToken },
      relations: ['advertisement', 'wizard'],
    });
    if (
      !booking ||
      (booking.status !== 'paid' && booking.status !== 'completed')
    ) {
      throw new NotFoundException(
        'Link do spotkania jest nieprawidłowy lub wygasł',
      );
    }

    const roomName = `ewrozka-guest-${booking.id}`;
    await this.dailyCo.ensureRoom(roomName);
    const endsAt = new Date(
      booking.scheduledAt.getTime() + booking.durationMinutes * 60_000,
    );
    const token = await this.dailyCo.createMeetingToken(
      roomName,
      booking.scheduledAt,
      endsAt,
    );

    return {
      roomUrl: `https://${this.config.get('daily.domain', { infer: true }) ?? 'ewrozka.daily.co'}/${roomName}`,
      token,
      booking: {
        wizardName: booking.wizard?.username ?? 'Specjalista',
        scheduledAt: booking.scheduledAt,
        durationMinutes: booking.durationMinutes,
        guestName: booking.guestName,
      },
    };
  }

  /** Wróżka: pokój spotkania po ID rezerwacji gościa (do przycisku "Dołącz") */
  async getWizardMeetingRoom(
    wizardId: number,
    bookingId: string,
  ): Promise<{
    roomUrl: string;
    token: string;
    booking: { guestName: string; scheduledAt: Date; durationMinutes: number };
  }> {
    const booking = await this.findOwned(wizardId, bookingId);
    if (booking.status !== 'paid' && booking.status !== 'completed') {
      throw new BadRequestException('Rezerwacja nie jest jeszcze opłacona');
    }
    const result = await this.getMeetingRoom(booking.guestToken!);
    return {
      roomUrl: result.roomUrl,
      token: result.token,
      booking: {
        guestName: result.booking.guestName,
        scheduledAt: result.booking.scheduledAt,
        durationMinutes: result.booking.durationMinutes,
      },
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async findOwned(
    wizardId: number,
    bookingId: string,
  ): Promise<GuestBookingEntity> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Rezerwacja nie istnieje');
    if (booking.wizardId !== wizardId)
      throw new BadRequestException('Brak uprawnień');
    return booking;
  }

  private async createCheckoutSession(
    booking: GuestBookingEntity,
  ): Promise<{ url: string }> {
    const appUrl =
      this.config.get('stripe.frontendUrl', { infer: true }) ??
      'http://localhost:4000';
    const ad = await this.adRepo.findOne({
      where: { id: booking.advertisementId! },
    });
    const wizard = await this.userRepo.findOne({
      where: { id: booking.wizardId },
    });
    const scheduledPl = booking.scheduledAt.toLocaleString('pl-PL', {
      timeZone: 'Europe/Warsaw',
    });

    // Sprawdź czy wróżka ma aktywne Stripe Connect
    const connectAccount = await this.connectAccountRepo.findOne({
      where: { userId: booking.wizardId },
    });
    const hasActiveConnect = !!(connectAccount?.onboardingCompleted && connectAccount?.payoutsEnabled);

    const platformFeePercentage = await this.paymentService.getPlatformFeePercentForUser(booking.wizardId);
    const platformFeeGrosze = Math.floor((booking.priceGrosze * platformFeePercentage) / 100);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: this.paymentMethods,
      mode: 'payment',
      customer_email: booking.guestEmail,
      line_items: [
        {
          price_data: {
            currency: this.currency,
            product_data: {
              name: ad?.title ?? 'Konsultacja ze specjalistą',
              description: `Spotkanie ze ${wizard?.username ?? 'specjalistą'} • ${scheduledPl} • ${booking.durationMinutes} min`,
            },
            unit_amount: booking.priceGrosze,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingType: 'guest',
        guestBookingId: booking.id,
        wizardId: String(booking.wizardId),
        priceGrosze: String(booking.priceGrosze),
        platformFeePercent: String(platformFeePercentage),
        isDestinationCharge: hasActiveConnect ? 'true' : 'false',
      },
      success_url: `${appUrl}/guest/platnosc/sukces?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/ogloszenie/${booking.advertisementId}?payment=cancelled`,
    };

    if (hasActiveConnect) {
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFeeGrosze,
        transfer_data: {
          destination: connectAccount!.stripeAccountId,
        },
      };
      this.logger.log(
        `Guest checkout (destination): ${booking.priceGrosze}gr → ${connectAccount!.stripeAccountId}, prowizja: ${platformFeeGrosze}gr`,
      );
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    booking.stripeSessionId = session.id;
    await this.bookingRepo.save(booking);

    return { url: session.url! };
  }

  private toRowDto(b: GuestBookingEntity) {
    return {
      id: b.id,
      guestName: b.guestName,
      guestEmail: b.guestEmail,
      guestPhone: b.guestPhone,
      message: b.message,
      scheduledAt: b.scheduledAt,
      durationMinutes: b.durationMinutes,
      priceGrosze: b.priceGrosze,
      status: b.status,
      rejectionReason: b.rejectionReason,
      createdAt: b.createdAt,
      advertisementTitle: b.advertisement?.title ?? null,
    };
  }
}
