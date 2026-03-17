import { AllConfigType } from '@/config/config.type';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { FeaturedWizardEntity, UserEntity } from '@repo/postgresql-typeorm';
import Stripe from 'stripe';
import { LessThan, Repository } from 'typeorm';

@Injectable()
export class FeaturedService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(FeaturedService.name);
  private readonly currency: string;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @InjectRepository(FeaturedWizardEntity)
    private readonly featuredRepo: Repository<FeaturedWizardEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {
    this.stripe = new Stripe(
      this.configService.get('stripe.secretKey', { infer: true })!,
    );
    this.currency = this.configService.get('stripe.currency', { infer: true }) ?? 'pln';
  }

  private get paymentMethods(): string[] {
    return this.currency === 'pln' ? ['card', 'blik', 'p24'] : ['card'];
  }

  // ─── Konfiguracja ────────────────────────────────────────────────────────────

  getFeaturedConfig() {
    const cfg = this.configService.getOrThrow('featured', { infer: true });
    return {
      priceGrosze: cfg.priceGrosze,
      durationHours: cfg.durationHours,
      slots: cfg.slots,
      rotationSeconds: cfg.rotationSeconds,
    };
  }

  // ─── Rotacja – czysto deterministyczna, bez Redis ────────────────────────────

  /**
   * Zwraca userId wróżek, które aktualnie są wyróżnione (bieżące okno rotacji).
   * Jeśli wyróżnionych jest <= slots, zwraca wszystkie.
   * Jeśli więcej – dzieli na grupy i co `rotationSeconds` pokazuje kolejną.
   */
  async getActiveFeaturedWizardIds(): Promise<number[]> {
    const { slots, rotationSeconds } = this.getFeaturedConfig();
    const now = new Date();

    const all = await this.featuredRepo.find({
      where: { isActive: true },
      order: { paidAt: 'ASC' },
    });

    // Odfiltruj wygasłe (cron może jeszcze nie zadziałał)
    const active = all.filter((f) => f.expiresAt > now);

    if (active.length === 0) return [];
    if (active.length <= slots) return active.map((f) => f.userId);

    const totalGroups = Math.ceil(active.length / slots);
    const currentGroup = Math.floor(Date.now() / (rotationSeconds * 1_000)) % totalGroups;
    const start = currentGroup * slots;

    return active.slice(start, start + slots).map((f) => f.userId);
  }

  /**
   * Sprawdza czy wróżka jest aktualnie wyróżniona (ma aktywny, niewygasły rekord).
   */
  async getWizardFeaturedStatus(userId: number): Promise<{
    isFeatured: boolean;
    expiresAt: Date | null;
  }> {
    const now = new Date();
    const record = await this.featuredRepo.findOne({
      where: { userId, isActive: true },
      order: { expiresAt: 'DESC' },
    });

    if (!record || record.expiresAt <= now) {
      return { isFeatured: false, expiresAt: null };
    }

    return { isFeatured: true, expiresAt: record.expiresAt };
  }

  // ─── Zakup wyróżnienia ────────────────────────────────────────────────────────

  /**
   * Tworzy Stripe PaymentIntent dla zakupu wyróżnienia.
   * Używany przez inline Payment Element (ten sam modal co płatności za wizyty).
   */
  async createFeaturedPaymentIntent(
    wizardId: number,
    wizardEmail: string,
  ): Promise<{ clientSecret: string }> {
    const user = await this.userRepo.findOne({
      where: { id: wizardId },
      relations: ['roles'],
    });

    if (!user) throw new NotFoundException('Użytkownik nie istnieje.');
    const isWizard = user.roles?.some((r) => r.name === 'wizard');
    if (!isWizard) throw new BadRequestException('Tylko specjaliści mogą kupić wyróżnienie.');

    const { isFeatured } = await this.getWizardFeaturedStatus(wizardId);
    if (isFeatured) {
      throw new BadRequestException('Twoje wyróżnienie jest już aktywne. Poczekaj aż wygaśnie.');
    }

    const { priceGrosze, durationHours } = this.getFeaturedConfig();

    const intent = await this.stripe.paymentIntents.create({
      amount: priceGrosze,
      currency: this.currency,
      payment_method_types: this.paymentMethods,
      receipt_email: wizardEmail,
      description: `Wyróżnienie specjalisty – ${durationHours}h`,
      metadata: {
        type: 'featured',
        wizardId: String(wizardId),
        durationHours: String(durationHours),
      },
    });

    if (!intent.client_secret) {
      throw new BadRequestException('Nie udało się utworzyć płatności.');
    }

    return { clientSecret: intent.client_secret };
  }

  /**
   * Weryfikuje PaymentIntent i aktywuje wyróżnienie jeśli opłacone.
   * Wywoływane przez frontend polling (taki sam mechanizm jak dla wizyt).
   */
  async verifyFeaturedPaymentIntent(
    paymentIntentId: string,
  ): Promise<{ success: boolean }> {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (!intent || intent.status !== 'succeeded') {
      return { success: false };
    }

    if (intent.metadata?.type !== 'featured') {
      return { success: false };
    }

    const wizardId = parseInt(intent.metadata.wizardId || '0', 10);
    const durationHours = parseInt(intent.metadata.durationHours || '6', 10);

    if (!wizardId) return { success: false };

    await this.activateFeatured(wizardId, paymentIntentId, durationHours);
    return { success: true };
  }

  /**
   * Wywoływane przez webhook Stripe po pomyślnym opłaceniu wyróżnienia.
   */
  async activateFeatured(
    wizardId: number,
    stripePaymentIntentId: string | null,
    durationHours: number,
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1_000);

    // Dezaktywuj poprzednie (edge-case: podwójny webhook)
    const existing = await this.featuredRepo.findOne({
      where: { userId: wizardId, isActive: true },
    });
    if (existing && existing.stripePaymentIntentId === stripePaymentIntentId) {
      this.logger.warn(`Featured już aktywowane dla wizard ${wizardId}, intent ${stripePaymentIntentId}`);
      return;
    }

    const record = this.featuredRepo.create({
      userId: wizardId,
      stripePaymentIntentId,
      paidAt: now,
      expiresAt,
      isActive: true,
    });

    await this.featuredRepo.save(record);
    this.logger.log(`Wyróżnienie aktywowane dla wizard ${wizardId} do ${expiresAt.toISOString()}`);
  }

  // ─── Cron – wygaszanie starych rekordów ───────────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async deactivateExpiredFeatured(): Promise<void> {
    const result = await this.featuredRepo.update(
      { isActive: true, expiresAt: LessThan(new Date()) },
      { isActive: false },
    );
    if (result.affected && result.affected > 0) {
      this.logger.log(`Wygaszono ${result.affected} wyróżnień.`);
    }
  }
}
