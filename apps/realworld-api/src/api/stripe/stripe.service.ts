import { AllConfigType } from '@/config/config.type';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Environment } from '@repo/nest-common';
import {
  AppointmentEntity,
  GuestBookingEntity,
  StripeConnectAccountEntity,
  WithdrawalEntity,
} from '@repo/postgresql-typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { FeaturedService } from '../featured/featured.service';
import { GuestBookingService } from '../guest-booking/guest-booking.service';
import { MeetingRoomService } from '../meeting-room/meeting-room.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildMeetingPaidNotification } from '../notifications/handlers';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);
  private readonly currency: string;
  private readonly instantPayouts: boolean;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepository: Repository<AppointmentEntity>,
    @InjectRepository(GuestBookingEntity)
    private readonly guestBookingRepository: Repository<GuestBookingEntity>,
    @InjectRepository(StripeConnectAccountEntity)
    private readonly connectAccountRepository: Repository<StripeConnectAccountEntity>,
    @InjectRepository(WithdrawalEntity)
    private readonly withdrawalRepository: Repository<WithdrawalEntity>,
    private readonly paymentService: PaymentService,
    private readonly meetingRoomService: MeetingRoomService,
    private readonly featuredService: FeaturedService,
    private readonly guestBookingService: GuestBookingService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.stripe = new Stripe(this.configService.get('stripe.secretKey', { infer: true })!);
    this.currency = this.configService.get('stripe.currency', { infer: true }) ?? 'pln';
    this.instantPayouts = this.configService.get('stripe.instantPayouts', { infer: true }) ?? false;
  }

  /** Metody płatności zależne od waluty — BLIK/P24 tylko PLN, Apple/Google Pay przez 'card' */
  private get paymentMethods(): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
    return this.currency === 'pln'
      ? ['card', 'blik', 'p24']
      : ['card'];
  }

  async createCheckoutSession(
    appointmentId: string,
    clientUserId: string,
    clientEmail: string,
  ): Promise<{ url: string }> {
    const appointment = await this.appointmentRepository.findOne({
      where: { uid: appointmentId },
      relations: ['advertisement', 'client', 'wrozka'],
    });

    if (!appointment) {
      throw new BadRequestException('Wizyta nie istnieje');
    }
    if (appointment.clientId !== clientUserId) {
      throw new BadRequestException('To nie Twoja wizyta');
    }
    if (appointment.status !== 'accepted') {
      throw new BadRequestException('Wizyta nie jest do opłacenia');
    }

    const priceGrosze = appointment.priceGrosze || appointment.advertisement?.priceGrosze || 0;
    const appUrl = this.configService.get('stripe.frontendUrl', { infer: true }) || 'http://localhost:4000';

    // Sprawdź czy wróżka ma aktywne Stripe Connect
    const connectAccount = await this.connectAccountRepository.findOne({
      where: { userId: appointment.wrozkaId },
    });
    const hasActiveConnect = connectAccount?.onboardingCompleted && connectAccount?.payoutsEnabled;

    const platformFeePercentage = await this.paymentService.getPlatformFeePercentForUser(appointment.wrozkaId);
    const platformFeeGrosze = Math.floor((priceGrosze * platformFeePercentage) / 100);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: this.paymentMethods,
      mode: 'payment',
      customer_email: clientEmail,
      line_items: [
        {
          price_data: {
            currency: this.currency,
            product_data: {
              name: appointment.advertisement?.title || 'Konsultacja ze specjalistą',
              description: `Spotkanie ze ${appointment.wrozka?.username || 'specjalistą'} • ${new Date(appointment.startsAt).toLocaleString('pl-PL')} • ${appointment.durationMinutes} min`,
            },
            unit_amount: priceGrosze,
          },
          quantity: 1,
        },
      ],
      metadata: {
        appointmentUid: appointment.uid,
        clientUserId,
        wrozkaId: appointment.wrozkaId,
        priceGrosze: String(priceGrosze),
        platformFeePercent: String(platformFeePercentage),
        isDestinationCharge: hasActiveConnect ? 'true' : 'false',
      },
      success_url: `${appUrl}/platnosc/sukces?session_id={CHECKOUT_SESSION_ID}&appointment_uid=${appointment.uid}`,
      cancel_url: `${appUrl}/panel/moje-spotkania?payment=cancelled`,
    };

    // Destination charge — 80% do wróżki, 20% zostaje u platformy
    if (hasActiveConnect) {
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFeeGrosze,
        transfer_data: {
          destination: connectAccount!.stripeAccountId,
        },
      };
      this.logger.log(
        `Destination charge: ${priceGrosze}gr → ${connectAccount!.stripeAccountId}, prowizja: ${platformFeeGrosze}gr (${platformFeePercentage}%)`,
      );
    } else {
      this.logger.log(`Standard charge (brak aktywnego Connect): ${priceGrosze}gr → konto platformy`);
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    this.logger.log(`Sesja Stripe utworzona: ${session.id} dla wizyty ${appointmentId}`);

    return { url: session.url! };
  }

  async createPaymentIntent(appointmentId: string, clientUserId: string): Promise<{ clientSecret: string }> {
    const appointment = await this.appointmentRepository.findOne({
      where: { uid: appointmentId },
      relations: ['advertisement', 'wrozka'],
    });

    if (!appointment) throw new BadRequestException('Wizyta nie istnieje');
    if (appointment.clientId !== clientUserId) throw new BadRequestException('To nie Twoja wizyta');
    if (appointment.status !== 'accepted') throw new BadRequestException('Wizyta nie jest do opłacenia');

    const priceGrosze = appointment.priceGrosze || appointment.advertisement?.priceGrosze || 0;

    const connectAccount = await this.connectAccountRepository.findOne({
      where: { userId: appointment.wrozkaId },
    });
    const hasActiveConnect = !!(connectAccount?.onboardingCompleted && connectAccount?.payoutsEnabled);

    const platformFeePercentage = await this.paymentService.getPlatformFeePercentForUser(appointment.wrozkaId);
    const platformFeeGrosze = Math.floor((priceGrosze * platformFeePercentage) / 100);

    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount: priceGrosze,
      currency: this.currency,
      payment_method_types: this.paymentMethods,
      metadata: {
        appointmentUid: appointment.uid,
        clientUserId,
        wrozkaId: appointment.wrozkaId,
        priceGrosze: String(priceGrosze),
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
        `PaymentIntent (destination): ${priceGrosze}gr → ${connectAccount!.stripeAccountId}, prowizja: ${platformFeeGrosze}gr`,
      );
    }

    const intent = await this.stripe.paymentIntents.create(intentParams);
    this.logger.log(`PaymentIntent utworzony: ${intent.id} dla wizyty ${appointmentId}`);

    return { clientSecret: intent.client_secret! };
  }

  async verifyPaymentIntent(paymentIntentId: string): Promise<{ success: boolean; appointmentUid?: string }> {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    this.logger.log(`verifyPaymentIntent: ${paymentIntentId} → status=${intent?.status}`);

    if (!intent || intent.status !== 'succeeded') {
      this.logger.log(`verifyPaymentIntent: płatność jeszcze nie zakończona (status=${intent?.status})`);
      return { success: false };
    }

    // Przepływ wyróżnienia — deleguj do FeaturedService
    if (intent.metadata?.type === 'featured') {
      return this.featuredService.verifyFeaturedPaymentIntent(paymentIntentId);
    }

    const appointmentUid = intent.metadata?.appointmentUid || '';
    if (!appointmentUid) {
      this.logger.error(`verifyPaymentIntent: brak appointmentUid w metadanych dla ${paymentIntentId}`);
      return { success: false };
    }

    const appointment = await this.appointmentRepository.findOne({
      where: { uid: appointmentUid },
    });
    if (!appointment) {
      this.logger.error(`verifyPaymentIntent: wizyta ${appointmentUid} nie znaleziona`);
      return { success: false };
    }

    if (appointment.status === 'paid') {
      this.logger.log(`verifyPaymentIntent: wizyta ${appointmentUid} już opłacona`);
      return { success: true, appointmentUid };
    }

    this.logger.log(`verifyPaymentIntent: oznaczanie wizyty ${appointmentUid} jako opłaconej`);

    try {
      await this.handlePaymentIntentSucceeded(intent);
    } catch (err) {
      this.logger.error(`verifyPaymentIntent: handlePaymentIntentSucceeded nie powiodło się dla ${appointmentUid}`, err);
      // Fallback — zaktualizuj status bezpośrednio nawet jeśli processPayment zawiedzie
      appointment.status = 'paid';
      await this.appointmentRepository.save(appointment);
      await this.meetingRoomService.createForAppointment(appointmentUid).catch(() => {});
    }

    return { success: true, appointmentUid };
  }

  async verifySession(sessionId: string): Promise<{ success: boolean; appointmentUid?: string }> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== 'paid') {
      return { success: false };
    }

    const appointmentUid = session.metadata?.appointmentUid || '';
    if (!appointmentUid) {
      return { success: false };
    }

    const appointment = await this.appointmentRepository.findOne({
      where: { uid: appointmentUid },
    });

    if (!appointment) {
      return { success: false };
    }

    if (appointment.status === 'paid') {
      this.logger.log(`Wizyta ${appointmentUid} już oznaczona jako opłacona (verify-session)`);
      return { success: true, appointmentUid };
    }

    const wrozkaId = session.metadata?.wrozkaId || '';
    const priceGrosze = parseInt(session.metadata?.priceGrosze || '0', 10);
    const isDestinationCharge = session.metadata?.isDestinationCharge === 'true';
    const feePercent = session.metadata?.platformFeePercent
      ? parseInt(session.metadata.platformFeePercent, 10)
      : undefined;

    if (isDestinationCharge) {
      await this.paymentService.recordDestinationCharge(wrozkaId, appointmentUid, priceGrosze, feePercent);
      this.logger.log(`Destination charge zarejestrowane dla wizyty ${appointmentUid} (verify-session)`);
    } else {
      await this.paymentService.processPayment(wrozkaId, appointmentUid, priceGrosze, feePercent);
    }

    appointment.status = 'paid';
    await this.appointmentRepository.save(appointment);

    await this.meetingRoomService.createForAppointment(appointmentUid);

    // Powiadom wróżkę o opłaceniu spotkania
    const paidAppVerify = await this.appointmentRepository.findOne({
      where: { uid: appointmentUid },
      relations: ['advertisement', 'client'],
    });
    if (paidAppVerify) {
      void this.notificationsService.createAndEmit(
        buildMeetingPaidNotification({
          wizardId: wrozkaId,
          clientName: paidAppVerify.client?.username ?? 'Klient',
          advertisementTitle: paidAppVerify.advertisement?.title ?? 'Konsultacja',
          appointmentId: appointmentUid,
          startsAt: paidAppVerify.startsAt?.toISOString?.() ?? '',
        }),
      );
    }

    this.logger.log(`Wizyta ${appointmentUid} opłacona pomyślnie przez verify-session`);
    return { success: true, appointmentUid };
  }

  async handleWebhook(req: any): Promise<void> {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = this.configService.get('stripe.webhookSecret', {
      infer: true,
    })!;

    let event: Stripe.Event;
    try {
      const rawBody = req.rawBody instanceof Buffer ? req.rawBody : Buffer.from(JSON.stringify(req.body));

      event = this.stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Weryfikacja sygnatury webhooka nie powiodła się: ${err.message}`);
      throw new BadRequestException(`Błąd webhooka: ${err.message}`);
    }

    this.logger.log(`Odebrano webhook Stripe: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Dla metod synchronicznych (card) payment_status === 'paid' od razu.
        // Dla asynchronicznych (BLIK, P24) payment_status === 'unpaid' — czekamy
        // na checkout.session.async_payment_succeeded.
        if (session.payment_status === 'paid') {
          await this.handleCheckoutCompleted(session);
        } else {
          this.logger.log(
            `checkout.session.completed: płatność w toku (${session.payment_status}) dla sesji ${session.id} — oczekiwanie na zdarzenie async`,
          );
        }
        break;
      }

      // BLIK / P24 — płatność potwierdzona asynchronicznie
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        this.logger.log(`checkout.session.async_payment_succeeded: przetwarzanie sesji ${session.id}`);
        await this.handleCheckoutCompleted(session);
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        this.logger.warn(`checkout.session.async_payment_failed: session ${session.id}`);
        break;
      }

      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentIntentSucceeded(intent);
        break;
      }

      default:
        break;
    }
  }

  // ── Stripe Connect ──────────────────────────────────────────────────

  async createAccountSession(userId: string, email: string): Promise<{ clientSecret: string; accountId: string }> {
    // Upewnij się że konto Connect istnieje
    let connectAccount = await this.connectAccountRepository.findOne({
      where: { userId },
    });

    if (!connectAccount) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: 'PL',
        email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        settings: {
          payouts: {
            schedule: { interval: 'manual' },
          },
        },
      });
      connectAccount = this.connectAccountRepository.create({
        userId,
        stripeAccountId: account.id,
        onboardingCompleted: false,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
      await this.connectAccountRepository.save(connectAccount);
      this.logger.log(`Utworzono konto Stripe Connect ${account.id} dla użytkownika ${userId}`);
    }

    const accountSession = await this.stripe.accountSessions.create({
      account: connectAccount.stripeAccountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
      },
    });

    return {
      clientSecret: accountSession.client_secret,
      accountId: connectAccount.stripeAccountId,
    };
  }

  async refreshConnectStatus(userId: string): Promise<void> {
    const connectAccount = await this.connectAccountRepository.findOne({
      where: { userId },
    });
    if (!connectAccount) return;
    try {
      const account = await this.stripe.accounts.retrieve(connectAccount.stripeAccountId);
      connectAccount.onboardingCompleted = account.details_submitted;
      connectAccount.chargesEnabled = account.charges_enabled;
      connectAccount.payoutsEnabled = account.payouts_enabled;
      await this.connectAccountRepository.save(connectAccount);

      // Wymuś ręczne wypłaty — wróżka sama zleca wypłatę
      await this.stripe.accounts.update(connectAccount.stripeAccountId, {
        settings: {
          payouts: {
            schedule: { interval: 'manual' },
          },
        },
      }).catch(() => {});
    } catch (err) {
      this.logger.warn(`refreshConnectStatus nie powiodło się: ${err}`);
    }
  }

  async getOrCreateConnectAccount(
    userId: string,
    email: string,
  ): Promise<{ onboardingUrl: string; alreadyOnboarded: boolean }> {
    let connectAccount = await this.connectAccountRepository.findOne({
      where: { userId },
    });

    if (!connectAccount) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: 'PL',
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: { interval: 'manual' },
          },
        },
      });

      connectAccount = this.connectAccountRepository.create({
        userId,
        stripeAccountId: account.id,
        onboardingCompleted: false,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
      await this.connectAccountRepository.save(connectAccount);
      this.logger.log(`Utworzono konto Stripe Connect ${account.id} dla użytkownika ${userId}`);
    }

    if (connectAccount.onboardingCompleted) {
      return { onboardingUrl: '', alreadyOnboarded: true };
    }

    const returnUrl = this.configService.get('stripe.connectReturnUrl', {
      infer: true,
    })!;
    const refreshUrl = this.configService.get('stripe.connectRefreshUrl', {
      infer: true,
    })!;

    const accountLink = await this.stripe.accountLinks.create({
      account: connectAccount.stripeAccountId,
      type: 'account_onboarding',
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });

    return { onboardingUrl: accountLink.url, alreadyOnboarded: false };
  }

  async quickCheckConnect(userId: string): Promise<{
    connected: boolean;
    onboardingCompleted: boolean;
    payoutsEnabled: boolean;
  }> {
    const connectAccount = await this.connectAccountRepository.findOne({
      where: { userId },
      select: ['onboardingCompleted', 'payoutsEnabled', 'stripeAccountId'],
    });

    if (!connectAccount) {
      return {
        connected: false,
        onboardingCompleted: false,
        payoutsEnabled: false,
      };
    }

    return {
      connected: true,
      onboardingCompleted: connectAccount.onboardingCompleted,
      payoutsEnabled: connectAccount.payoutsEnabled,
    };
  }

  async getConnectAccountStatus(userId: string): Promise<{
    connected: boolean;
    onboardingCompleted: boolean;
    payoutsEnabled: boolean;
    stripeAccountId?: string;
    stripeAvailableGrosze?: number;
    stripePendingGrosze?: number;
  }> {
    const connectAccount = await this.connectAccountRepository.findOne({
      where: { userId },
    });

    if (!connectAccount) {
      return {
        connected: false,
        onboardingCompleted: false,
        payoutsEnabled: false,
      };
    }

    // Odśwież status konta z Stripe
    try {
      const account = await this.stripe.accounts.retrieve(connectAccount.stripeAccountId);
      connectAccount.onboardingCompleted = account.details_submitted;
      connectAccount.chargesEnabled = account.charges_enabled;
      connectAccount.payoutsEnabled = account.payouts_enabled;
      await this.connectAccountRepository.save(connectAccount);
    } catch (err) {
      this.logger.warn(`Nie udało się odświeżyć statusu konta Stripe: ${err}`);
    }

    // Pobierz rzeczywiste saldo Stripe connected account
    let stripeAvailableGrosze = 0;
    let stripePendingGrosze = 0;
    if (connectAccount.onboardingCompleted) {
      try {
        const balance = await this.stripe.balance.retrieve({
          stripeAccount: connectAccount.stripeAccountId,
        });
        const pln = balance.available.find((b) => b.currency === this.currency);
        const pending = balance.pending.find((b) => b.currency === this.currency);
        stripeAvailableGrosze = pln?.amount ?? 0;
        stripePendingGrosze = pending?.amount ?? 0;
      } catch (err) {
        this.logger.warn(`Nie udało się pobrać salda Stripe: ${err}`);
      }
    }

    return {
      connected: true,
      onboardingCompleted: connectAccount.onboardingCompleted,
      payoutsEnabled: connectAccount.payoutsEnabled,
      stripeAccountId: connectAccount.stripeAccountId,
      stripeAvailableGrosze,
      stripePendingGrosze,
    };
  }

  async createWithdrawal(userId: string, amountGrosze: number): Promise<WithdrawalEntity> {
    if (amountGrosze < 500) {
      throw new BadRequestException('Minimalna kwota wypłaty to 5 zł');
    }

    const connectAccount = await this.connectAccountRepository.findOne({
      where: { userId },
    });

    if (!connectAccount || !connectAccount.onboardingCompleted) {
      throw new BadRequestException('Musisz najpierw połączyć konto Stripe');
    }

    if (!connectAccount.payoutsEnabled) {
      throw new BadRequestException('Wypłaty nie są jeszcze aktywowane na Twoim koncie Stripe');
    }

    // Sprawdź rzeczywiste dostępne saldo Stripe
    let stripeAvailableGrosze = 0;
    try {
      const balance = await this.stripe.balance.retrieve({
        stripeAccount: connectAccount.stripeAccountId,
      });
      const pln = balance.available.find((b) => b.currency === this.currency);
      stripeAvailableGrosze = pln?.amount ?? 0;
    } catch (err: any) {
      throw new BadRequestException(`Nie można pobrać salda Stripe: ${err.message}`);
    }

    if (stripeAvailableGrosze < amountGrosze) {
      const available = (stripeAvailableGrosze / 100).toFixed(2);
      throw new BadRequestException(
        `Niewystarczające saldo. Dostępne w Stripe: ${available} zł. Środki oczekujące pojawią się po 1–2 dniach roboczych.`,
      );
    }

    // Utwórz payout na connected account wróżki
    let stripeTransferId: string | null = null;
    let failureReason: string | null = null;

    try {
      const payout = await this.stripe.payouts.create(
        {
          amount: amountGrosze,
          currency: this.currency,
          description: `Wypłata eWróżka (user ${userId})`,
          ...(this.instantPayouts ? { method: 'instant' as const } : {}),
        },
        { stripeAccount: connectAccount.stripeAccountId },
      );
      stripeTransferId = payout.id;
      this.logger.log(`Wypłata Stripe utworzona: ${payout.id} dla użytkownika ${userId}`);
    } catch (err: any) {
      failureReason = err.message;
      this.logger.error(`Wypłata Stripe nie powiodła się dla użytkownika ${userId}: ${err.message}`);
      throw new BadRequestException(`Błąd wypłaty: ${err.message}`);
    }

    const withdrawal = this.withdrawalRepository.create({
      userId,
      amountGrosze,
      stripeAccountId: connectAccount.stripeAccountId,
      stripeTransferId,
      status: 'processing',
      failureReason,
    });
    await this.withdrawalRepository.save(withdrawal);

    return withdrawal;
  }

  async getWithdrawals(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ withdrawals: WithdrawalEntity[]; total: number }> {
    const [withdrawals, total] = await this.withdrawalRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { withdrawals, total };
  }

  // ────────────────────────────────────────────────────────────────────

  /** Nie-prod: Top-up + transfer – środki od razu available u platformy i wróżki */
  private async ensureFundsAvailableNonProd(
    wrozkaId: string,
    totalAmountGrosze: number,
    platformFeePercent?: number,
  ): Promise<void> {
    const nodeEnv = this.configService.get('app.nodeEnv', { infer: true });
    if (nodeEnv === Environment.PRODUCTION) return;

    const feePercent = platformFeePercent ?? 20;
    const platformFeeGrosze = Math.floor((totalAmountGrosze * feePercent) / 100);
    const wizardAmountGrosze = totalAmountGrosze - platformFeeGrosze;

    try {
      await this.stripe.topups.create({
        amount: totalAmountGrosze,
        currency: this.currency,
        source: 'tok_bypassPending' as string,
        description: 'Top-up eWróżka (non-prod)',
      });
      const connectAccount = await this.connectAccountRepository.findOne({
        where: { userId: wrozkaId },
      });
      if (!connectAccount?.onboardingCompleted) return;

      // Wymuś ręczne wypłaty na connected account
      await this.stripe.accounts.update(connectAccount.stripeAccountId, {
        settings: {
          payouts: {
            schedule: { interval: 'manual' },
          },
        },
      }).catch(() => {});

      await this.stripe.transfers.create({
        amount: wizardAmountGrosze,
        currency: this.currency,
        destination: connectAccount.stripeAccountId,
        description: 'Transfer eWróżka (non-prod)',
      });
      this.logger.log(`Non-prod: top-up ${totalAmountGrosze}gr, transfer ${wizardAmountGrosze}gr → wizard ${wrozkaId}`);
    } catch (err) {
      this.logger.warn(
        `ensureFundsAvailableNonProd nie powiodło się: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
    // ── Gość ──────────────────────────────────────────────────────────────────
    if (intent.metadata?.bookingType === 'guest') {
      const guestBookingId = intent.metadata.guestBookingId;
      if (guestBookingId) {
        await this.guestBookingService.handlePaymentSuccessById(guestBookingId);
        const wizardId = intent.metadata?.wizardId || '';
        const priceGrosze = parseInt(intent.metadata?.priceGrosze || '0', 10);
        const isDestCharge = intent.metadata?.isDestinationCharge === 'true';
        const feePercent = intent.metadata?.platformFeePercent
          ? parseInt(intent.metadata.platformFeePercent, 10)
          : undefined;

        if (wizardId && priceGrosze) {
          if (isDestCharge) {
            await this.paymentService.recordDestinationCharge(wizardId, null, priceGrosze, feePercent);
          } else {
            await this.paymentService.processPayment(wizardId, null, priceGrosze, feePercent);
          }
          await this.ensureFundsAvailableNonProd(wizardId, priceGrosze, feePercent);
        }
        this.logger.log(`Rezerwacja gościa ${guestBookingId} opłacona przez payment_intent.succeeded`);
      }
      return;
    }

    const appointmentUid = intent.metadata?.appointmentUid || '';
    const wrozkaId = intent.metadata?.wrozkaId || '';
    const priceGrosze = parseInt(intent.metadata?.priceGrosze || '0', 10);
    const isDestinationCharge = intent.metadata?.isDestinationCharge === 'true';
    const feePercent = intent.metadata?.platformFeePercent
      ? parseInt(intent.metadata.platformFeePercent, 10)
      : undefined;

    if (!appointmentUid) {
      this.logger.warn('payment_intent.succeeded: brak appointmentUid w metadanych — pomijam');
      return;
    }

    const appointment = await this.appointmentRepository.findOne({
      where: { uid: appointmentUid },
    });
    if (!appointment) {
      this.logger.error(`payment_intent.succeeded: wizyta ${appointmentUid} nie znaleziona`);
      return;
    }
    if (appointment.status === 'paid') {
      this.logger.warn(`payment_intent.succeeded: wizyta ${appointmentUid} już opłacona`);
      return;
    }

    if (isDestinationCharge) {
      await this.paymentService.recordDestinationCharge(wrozkaId, appointmentUid, priceGrosze, feePercent);
    } else {
      await this.paymentService.processPayment(wrozkaId, appointmentUid, priceGrosze, feePercent);
    }

    appointment.status = 'paid';
    await this.appointmentRepository.save(appointment);
    await this.meetingRoomService.createForAppointment(appointmentUid);

    // Powiadom wróżkę o opłaceniu spotkania
    const paidAppointment = await this.appointmentRepository.findOne({
      where: { uid: appointmentUid },
      relations: ['advertisement', 'client'],
    });
    if (paidAppointment) {
      void this.notificationsService.createAndEmit(
        buildMeetingPaidNotification({
          wizardId: wrozkaId,
          clientName: paidAppointment.client?.username ?? 'Klient',
          advertisementTitle: paidAppointment.advertisement?.title ?? 'Konsultacja',
          appointmentId: appointmentUid,
          startsAt: paidAppointment.startsAt?.toISOString?.() ?? '',
        }),
      );
    }

    await this.ensureFundsAvailableNonProd(wrozkaId, priceGrosze, feePercent);

    this.logger.log(`Wizyta ${appointmentUid} opłacona przez payment_intent.succeeded`);
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    // ── Rezerwacja gościa ───────────────────────────────────────────────────
    if (session.metadata?.bookingType === 'guest') {
      await this.guestBookingService.handlePaymentSuccess(session.id);
      const wizardId = session.metadata?.wizardId || '';
      const priceGrosze = parseInt(session.metadata?.priceGrosze || '0', 10);
      const isDestCharge = session.metadata?.isDestinationCharge === 'true';
      const feePercent = session.metadata?.platformFeePercent
        ? parseInt(session.metadata.platformFeePercent, 10)
        : undefined;

      if (wizardId && priceGrosze) {
        if (isDestCharge) {
          await this.paymentService.recordDestinationCharge(wizardId, null, priceGrosze, feePercent);
        } else {
          await this.paymentService.processPayment(wizardId, null, priceGrosze, feePercent);
        }
        await this.ensureFundsAvailableNonProd(wizardId, priceGrosze, feePercent);
      }
      return;
    }

    // ── Wyróżnienie wróżki ──────────────────────────────────────────────────
    if (session.metadata?.type === 'featured') {
      const wizardId = session.metadata.wizardId || '';
      const durationHours = parseInt(session.metadata.durationHours || '6', 10);
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

      if (!wizardId) {
        this.logger.error('Featured checkout: brak wizardId w metadanych');
        return;
      }

      await this.featuredService.activateFeatured(wizardId, paymentIntentId, durationHours);
      this.logger.log(`Wyróżnienie aktywowane dla specjalisty ${wizardId}`);
      return;
    }

    // ── Płatność za wizytę ──────────────────────────────────────────────────
    const appointmentUid = session.metadata?.appointmentUid || '';
    const wrozkaId = session.metadata?.wrozkaId || '';
    const priceGrosze = parseInt(session.metadata?.priceGrosze || '0', 10);
    const isDestinationCharge = session.metadata?.isDestinationCharge === 'true';
    const feePercent = session.metadata?.platformFeePercent
      ? parseInt(session.metadata.platformFeePercent, 10)
      : undefined;

    if (!appointmentUid) {
      this.logger.error('Brak appointmentUid w metadanych webhooka');
      return;
    }

    const appointment = await this.appointmentRepository.findOne({
      where: { uid: appointmentUid },
    });

    if (!appointment) {
      this.logger.error(`Wizyta ${appointmentUid} nie znaleziona`);
      return;
    }

    if (appointment.status === 'paid') {
      this.logger.warn(`Wizyta ${appointmentUid} już opłacona`);
      return;
    }

    if (isDestinationCharge) {
      await this.paymentService.recordDestinationCharge(wrozkaId, appointmentUid, priceGrosze, feePercent);
      this.logger.log(`Destination charge zarejestrowane dla wizyty ${appointmentUid}`);
    } else {
      await this.paymentService.processPayment(wrozkaId, appointmentUid, priceGrosze, feePercent);
    }

    // Update appointment status
    appointment.status = 'paid';
    await this.appointmentRepository.save(appointment);

    // Create meeting room
    await this.meetingRoomService.createForAppointment(appointmentUid);

    // Powiadom wróżkę o opłaceniu spotkania
    const paidAppCheckout = await this.appointmentRepository.findOne({
      where: { uid: appointmentUid },
      relations: ['advertisement', 'client'],
    });
    if (paidAppCheckout) {
      void this.notificationsService.createAndEmit(
        buildMeetingPaidNotification({
          wizardId: wrozkaId,
          clientName: paidAppCheckout.client?.username ?? 'Klient',
          advertisementTitle: paidAppCheckout.advertisement?.title ?? 'Konsultacja',
          appointmentId: appointmentUid,
          startsAt: paidAppCheckout.startsAt?.toISOString?.() ?? '',
        }),
      );
    }

    await this.ensureFundsAvailableNonProd(wrozkaId, priceGrosze, feePercent);

    this.logger.log(`Wizyta ${appointmentUid} opłacona pomyślnie przez Stripe`);
  }
}
