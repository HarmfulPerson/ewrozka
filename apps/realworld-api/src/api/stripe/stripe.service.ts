import { AllConfigType } from '@/config/config.type';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Environment } from '@repo/nest-common';
import {
  AppointmentEntity,
  GuestBookingEntity,
  StripeConnectAccountEntity,
  WalletEntity,
  WithdrawalEntity,
} from '@repo/postgresql-typeorm';
import Stripe from 'stripe';
import { DataSource, Repository } from 'typeorm';
import { FeaturedService } from '../featured/featured.service';
import { GuestBookingService } from '../guest-booking/guest-booking.service';
import { MeetingRoomService } from '../meeting-room/meeting-room.service';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

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
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    private readonly dataSource: DataSource,
    private readonly paymentService: PaymentService,
    private readonly meetingRoomService: MeetingRoomService,
    private readonly featuredService: FeaturedService,
    private readonly guestBookingService: GuestBookingService,
  ) {
    this.stripe = new Stripe(this.configService.get('stripe.secretKey', { infer: true })!);
  }

  async createCheckoutSession(
    appointmentId: number,
    clientUserId: number,
    clientEmail: string,
  ): Promise<{ url: string }> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
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
      payment_method_types: ['card', 'blik', 'p24'],
      mode: 'payment',
      customer_email: clientEmail,
      line_items: [
        {
          price_data: {
            currency: 'pln',
            product_data: {
              name: appointment.advertisement?.title || 'Konsultacja z wróżką',
              description: `Spotkanie z ${appointment.wrozka?.username || 'wróżką'} • ${new Date(appointment.startsAt).toLocaleString('pl-PL')} • ${appointment.durationMinutes} min`,
            },
            unit_amount: priceGrosze,
          },
          quantity: 1,
        },
      ],
      metadata: {
        appointmentId: String(appointmentId),
        clientUserId: String(clientUserId),
        wrozkaId: String(appointment.wrozkaId),
        priceGrosze: String(priceGrosze),
        platformFeePercent: String(platformFeePercentage),
        isDestinationCharge: hasActiveConnect ? 'true' : 'false',
      },
      success_url: `${appUrl}/platnosc/sukces?session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId}`,
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

  async createPaymentIntent(appointmentId: number, clientUserId: number): Promise<{ clientSecret: string }> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
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
      currency: 'pln',
      payment_method_types: ['card', 'blik', 'p24'],
      metadata: {
        appointmentId: String(appointmentId),
        clientUserId: String(clientUserId),
        wrozkaId: String(appointment.wrozkaId),
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

  async verifyPaymentIntent(paymentIntentId: string): Promise<{ success: boolean; appointmentId?: number }> {
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

    const appointmentId = parseInt(intent.metadata?.appointmentId || '0', 10);
    if (!appointmentId) {
      this.logger.error(`verifyPaymentIntent: brak appointmentId w metadanych dla ${paymentIntentId}`);
      return { success: false };
    }

    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
    });
    if (!appointment) {
      this.logger.error(`verifyPaymentIntent: wizyta ${appointmentId} nie znaleziona`);
      return { success: false };
    }

    if (appointment.status === 'paid') {
      this.logger.log(`verifyPaymentIntent: wizyta ${appointmentId} już opłacona`);
      return { success: true, appointmentId };
    }

    this.logger.log(`verifyPaymentIntent: oznaczanie wizyty ${appointmentId} jako opłaconej`);

    try {
      await this.handlePaymentIntentSucceeded(intent);
    } catch (err) {
      this.logger.error(`verifyPaymentIntent: handlePaymentIntentSucceeded nie powiodło się dla ${appointmentId}`, err);
      // Fallback — zaktualizuj status bezpośrednio nawet jeśli processPayment zawiedzie
      appointment.status = 'paid';
      await this.appointmentRepository.save(appointment);
      await this.meetingRoomService.createForAppointment(appointmentId).catch(() => {});
    }

    return { success: true, appointmentId };
  }

  async verifySession(sessionId: string): Promise<{ success: boolean; appointmentId?: number }> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== 'paid') {
      return { success: false };
    }

    const appointmentId = parseInt(session.metadata?.appointmentId || '0', 10);
    if (!appointmentId) {
      return { success: false };
    }

    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return { success: false };
    }

    if (appointment.status === 'paid') {
      this.logger.log(`Wizyta ${appointmentId} już oznaczona jako opłacona (verify-session)`);
      return { success: true, appointmentId };
    }

    const wrozkaId = parseInt(session.metadata?.wrozkaId || '0', 10);
    const priceGrosze = parseInt(session.metadata?.priceGrosze || '0', 10);
    const isDestinationCharge = session.metadata?.isDestinationCharge === 'true';
    const feePercent = session.metadata?.platformFeePercent
      ? parseInt(session.metadata.platformFeePercent, 10)
      : undefined;

    if (isDestinationCharge) {
      await this.paymentService.recordDestinationCharge(wrozkaId, appointmentId, priceGrosze, feePercent);
      this.logger.log(`Destination charge zarejestrowane dla wizyty ${appointmentId} (verify-session)`);
    } else {
      await this.paymentService.processPayment(wrozkaId, appointmentId, priceGrosze, feePercent);
    }

    appointment.status = 'paid';
    await this.appointmentRepository.save(appointment);

    await this.meetingRoomService.createForAppointment(appointmentId);

    this.logger.log(`Wizyta ${appointmentId} opłacona pomyślnie przez verify-session`);
    return { success: true, appointmentId };
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

  async getWalletBalance(userId: number): Promise<number> {
    return this.paymentService.getWalletBalance(userId);
  }

  async createAccountSession(userId: number, email: string): Promise<{ clientSecret: string; accountId: string }> {
    // Upewnij się że konto Connect istnieje
    let connectAccount = await this.connectAccountRepository.findOne({
      where: { userId },
    });

    if (!connectAccount) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: 'PL',
        email,
        capabilities: { transfers: { requested: true } },
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

  async refreshConnectStatus(userId: number): Promise<void> {
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
    } catch (err) {
      this.logger.warn(`refreshConnectStatus nie powiodło się: ${err}`);
    }
  }

  async getOrCreateConnectAccount(
    userId: number,
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
          transfers: { requested: true },
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

  async quickCheckConnect(userId: number): Promise<{
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

  async getConnectAccountStatus(userId: number): Promise<{
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
        const pln = balance.available.find((b) => b.currency === 'pln');
        const pending = balance.pending.find((b) => b.currency === 'pln');
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

  async createWithdrawal(userId: number, amountGrosze: number): Promise<WithdrawalEntity> {
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
      const pln = balance.available.find((b) => b.currency === 'pln');
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

    // Sprawdź wewnętrzne saldo portfela — cap na zarobioną kwotę (po prowizji)
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    const walletBalance = wallet ? Number(wallet.balance) : 0;

    if (walletBalance < amountGrosze) {
      const available = (walletBalance / 100).toFixed(2);
      throw new BadRequestException(`Kwota przekracza Twoje zarobki. Maksymalna wypłata: ${available} zł.`);
    }

    return await this.dataSource.transaction(async (manager) => {
      // Odejmij z portfela
      const walletInTx = await manager.findOne(WalletEntity, {
        where: { userId },
      });
      if (walletInTx) {
        walletInTx.balance = Number(walletInTx.balance) - amountGrosze;
        await manager.save(WalletEntity, walletInTx);
      }

      // Utwórz payout na connected account wróżki
      let stripeTransferId: string | null = null;
      let status = 'processing';
      let failureReason: string | null = null;

      try {
        const payout = await this.stripe.payouts.create(
          {
            amount: amountGrosze,
            currency: 'pln',
            description: `Wypłata eWróżka (user ${userId})`,
          },
          { stripeAccount: connectAccount.stripeAccountId },
        );
        stripeTransferId = payout.id;
        status = 'processing';
        this.logger.log(`Wypłata Stripe utworzona: ${payout.id} dla użytkownika ${userId}`);
      } catch (err: any) {
        failureReason = err.message;
        status = 'failed';
        // Jeśli payout się nie powiódł — zwróć saldo
        wallet!.balance = Number(wallet!.balance) + amountGrosze;
        await manager.save(WalletEntity, wallet);
        this.logger.error(`Wypłata Stripe nie powiodła się dla użytkownika ${userId}: ${err.message}`);
        throw new BadRequestException(`Błąd wypłaty: ${err.message}`);
      }

      const withdrawal = manager.create(WithdrawalEntity, {
        userId,
        amountGrosze,
        stripeAccountId: connectAccount.stripeAccountId,
        stripeTransferId,
        status,
        failureReason,
      });
      await manager.save(WithdrawalEntity, withdrawal);

      return withdrawal;
    });
  }

  async getWithdrawals(
    userId: number,
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
    wrozkaId: number,
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
        currency: 'pln',
        source: 'tok_bypassPending' as string,
        description: 'Top-up eWróżka (non-prod)',
      });
      const connectAccount = await this.connectAccountRepository.findOne({
        where: { userId: wrozkaId },
      });
      if (!connectAccount?.onboardingCompleted) return;

      await this.stripe.transfers.create({
        amount: wizardAmountGrosze,
        currency: 'pln',
        destination: connectAccount.stripeAccountId,
        description: 'Transfer eWróżka (non-prod)',
      });
      let wallet = await this.walletRepository.findOne({
        where: { userId: wrozkaId },
      });
      if (!wallet) {
        wallet = this.walletRepository.create({
          userId: wrozkaId,
          balance: 0,
          currency: 'PLN',
        });
      }
      wallet.balance = Number(wallet.balance) + wizardAmountGrosze;
      await this.walletRepository.save(wallet);
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
        const booking = await this.guestBookingRepository.findOne({
          where: { id: guestBookingId },
          select: ['wizardId', 'priceGrosze'],
        });
        if (booking) {
          await this.ensureFundsAvailableNonProd(booking.wizardId, booking.priceGrosze);
        }
        this.logger.log(`Rezerwacja gościa ${guestBookingId} opłacona przez payment_intent.succeeded`);
      }
      return;
    }

    const appointmentId = parseInt(intent.metadata?.appointmentId || '0', 10);
    const wrozkaId = parseInt(intent.metadata?.wrozkaId || '0', 10);
    const priceGrosze = parseInt(intent.metadata?.priceGrosze || '0', 10);
    const isDestinationCharge = intent.metadata?.isDestinationCharge === 'true';
    const feePercent = intent.metadata?.platformFeePercent
      ? parseInt(intent.metadata.platformFeePercent, 10)
      : undefined;

    if (!appointmentId) {
      this.logger.warn('payment_intent.succeeded: brak appointmentId w metadanych — pomijam');
      return;
    }

    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
    });
    if (!appointment) {
      this.logger.error(`payment_intent.succeeded: wizyta ${appointmentId} nie znaleziona`);
      return;
    }
    if (appointment.status === 'paid') {
      this.logger.warn(`payment_intent.succeeded: wizyta ${appointmentId} już opłacona`);
      return;
    }

    if (isDestinationCharge) {
      await this.paymentService.recordDestinationCharge(wrozkaId, appointmentId, priceGrosze, feePercent);
    } else {
      await this.paymentService.processPayment(wrozkaId, appointmentId, priceGrosze, feePercent);
    }

    appointment.status = 'paid';
    await this.appointmentRepository.save(appointment);
    await this.meetingRoomService.createForAppointment(appointmentId);

    await this.ensureFundsAvailableNonProd(wrozkaId, priceGrosze, feePercent);

    this.logger.log(`Wizyta ${appointmentId} opłacona przez payment_intent.succeeded`);
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    // ── Rezerwacja gościa ───────────────────────────────────────────────────
    if (session.metadata?.bookingType === 'guest') {
      await this.guestBookingService.handlePaymentSuccess(session.id);
      const booking = await this.guestBookingRepository.findOne({
        where: { stripeSessionId: session.id },
        select: ['wizardId', 'priceGrosze'],
      });
      if (booking) {
        await this.ensureFundsAvailableNonProd(booking.wizardId, booking.priceGrosze);
      }
      return;
    }

    // ── Wyróżnienie wróżki ──────────────────────────────────────────────────
    if (session.metadata?.type === 'featured') {
      const wizardId = parseInt(session.metadata.wizardId || '0', 10);
      const durationHours = parseInt(session.metadata.durationHours || '6', 10);
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

      if (!wizardId) {
        this.logger.error('Featured checkout: brak wizardId w metadanych');
        return;
      }

      await this.featuredService.activateFeatured(wizardId, paymentIntentId, durationHours);
      this.logger.log(`Wyróżnienie aktywowane dla wróżki ${wizardId}`);
      return;
    }

    // ── Płatność za wizytę ──────────────────────────────────────────────────
    const appointmentId = parseInt(session.metadata?.appointmentId || '0', 10);
    const wrozkaId = parseInt(session.metadata?.wrozkaId || '0', 10);
    const priceGrosze = parseInt(session.metadata?.priceGrosze || '0', 10);
    const isDestinationCharge = session.metadata?.isDestinationCharge === 'true';
    const feePercent = session.metadata?.platformFeePercent
      ? parseInt(session.metadata.platformFeePercent, 10)
      : undefined;

    if (!appointmentId) {
      this.logger.error('Brak appointmentId w metadanych webhooka');
      return;
    }

    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
    });

    if (!appointment) {
      this.logger.error(`Wizyta ${appointmentId} nie znaleziona`);
      return;
    }

    if (appointment.status === 'paid') {
      this.logger.warn(`Wizyta ${appointmentId} już opłacona`);
      return;
    }

    if (isDestinationCharge) {
      await this.paymentService.recordDestinationCharge(wrozkaId, appointmentId, priceGrosze, feePercent);
      this.logger.log(`Destination charge zarejestrowane dla wizyty ${appointmentId}`);
    } else {
      await this.paymentService.processPayment(wrozkaId, appointmentId, priceGrosze, feePercent);
    }

    // Update appointment status
    appointment.status = 'paid';
    await this.appointmentRepository.save(appointment);

    // Create meeting room
    await this.meetingRoomService.createForAppointment(appointmentId);

    await this.ensureFundsAvailableNonProd(wrozkaId, priceGrosze, feePercent);

    this.logger.log(`Wizyta ${appointmentId} opłacona pomyślnie przez Stripe`);
  }
}
