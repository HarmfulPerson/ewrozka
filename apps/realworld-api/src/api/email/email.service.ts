import * as path from 'path';
import * as fs from 'fs';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import { EmailJob } from './email-job.interface';
import { EmailType } from './email-type.enum';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: nodemailer.Transporter;
  private readonly templateCache = new Map<string, handlebars.TemplateDelegate>();

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  onModuleInit() {
    const emailCfg = this.configService.getOrThrow('email', { infer: true });

    this.transporter = nodemailer.createTransport({
      host: emailCfg.host,
      port: emailCfg.port,
      secure: emailCfg.port === 465, // true dla 465, false dla 587 (STARTTLS)
      auth: {
        user: emailCfg.user,
        pass: emailCfg.pass,
      },
      ...(emailCfg.port === 587 && { requireTLS: true }),
    });
  }

  /**
   * Wysyła e-mail na podstawie obiektu EmailJob.
   * Metoda publiczna - można ją wywoływać bezpośrednio lub opakować kolejką.
   */
  async send(job: EmailJob): Promise<void> {
    try {
      const html = await this.renderTemplate(job.type, job.context);
      const emailCfg = this.configService.getOrThrow('email', { infer: true });

      await this.transporter.sendMail({
        from: `"eWróżka" <${emailCfg.from}>`,
        to: job.to,
        subject: job.subject,
        html,
      });

      this.logger.log(`Email [${job.type}] sent to ${job.to}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined;
      const response = err && typeof err === 'object' && 'response' in err ? (err as { response?: string }).response : undefined;
      this.logger.error(`Failed to send email [${job.type}] to ${job.to}: ${msg}${code ? ` (code: ${code})` : ''}${response ? ` response: ${response}` : ''}`);
      throw err;
    }
  }

  // ─── Convenience helpers ──────────────────────────────────────────────────

  async sendVerificationEmail(to: string, username: string, token: string): Promise<void> {
    const frontendUrl = this.configService.getOrThrow('email', { infer: true }).frontendUrl;
    const verifyUrl = `${frontendUrl}/weryfikacja-emaila?token=${token}`;

    await this.send({
      type: EmailType.VERIFY_EMAIL,
      to,
      subject: 'Potwierdź swój adres e-mail – eWróżka',
      context: { username, verifyUrl },
    });
  }

  async sendWizardApplicationApproved(to: string, username: string): Promise<void> {
    const frontendUrl = this.configService.getOrThrow('email', { infer: true }).frontendUrl;
    const loginUrl = `${frontendUrl}/login`;

    await this.send({
      type: EmailType.WIZARD_APPLICATION_APPROVED,
      to,
      subject: '🎉 Twoje konto wróżki zostało zatwierdzone – eWróżka',
      context: { username, loginUrl },
    });
  }

  async sendWelcomeClient(to: string, username: string): Promise<void> {
    const frontendUrl = this.configService.getOrThrow('email', { infer: true }).frontendUrl;
    const loginUrl = `${frontendUrl}/login`;

    await this.send({
      type: EmailType.WELCOME_CLIENT,
      to,
      subject: 'Witaj w eWróżce! 👋',
      context: { username, loginUrl },
    });
  }

  async sendWelcomeWizard(to: string, username: string): Promise<void> {
    const frontendUrl = this.configService.getOrThrow('email', { infer: true }).frontendUrl;
    const loginUrl = `${frontendUrl}/login`;

    await this.send({
      type: EmailType.WELCOME_WIZARD,
      to,
      subject: 'Witaj na platformie eWróżka! ✨',
      context: { username, loginUrl },
    });
  }

  /** Po zakończonym spotkaniu – zalogowany klient: zachęta do oceny */
  async sendMeetingCompletedRate(
    to: string,
    username: string,
    wizardName: string,
    adTitle: string,
  ): Promise<void> {
    const frontendUrl = this.configService.getOrThrow('email', { infer: true }).frontendUrl;
    const rateUrl = `${frontendUrl}/panel/moje-spotkania`;

    await this.send({
      type: EmailType.MEETING_COMPLETED_RATE,
      to,
      subject: 'Oceń swoje spotkanie ⭐ – eWróżka',
      context: { username, wizardName, adTitle, rateUrl },
    });
  }

  /** Po zakończonym spotkaniu – gość: podziękowanie */
  async sendMeetingCompletedGuest(
    to: string,
    guestName: string,
    wizardName: string,
  ): Promise<void> {
    const frontendUrl = this.configService.getOrThrow('email', { infer: true }).frontendUrl;

    await this.send({
      type: EmailType.MEETING_COMPLETED_GUEST,
      to,
      subject: 'Dziękujemy za spotkanie! ✨ – eWróżka',
      context: { guestName, wizardName, appUrl: frontendUrl },
    });
  }

  /** Przypomnienie o nadchodzącym spotkaniu (opłacone) – link do pokoju */
  async sendMeetingReminderPaid(
    to: string,
    recipientName: string,
    wizardName: string,
    adTitle: string,
    scheduledAt: string,
    durationMinutes: number,
    meetingUrl: string,
    hoursLabel: string,
  ): Promise<void> {
    await this.send({
      type: EmailType.MEETING_REMINDER_PAID,
      to,
      subject: `Przypomnienie: spotkanie za ${hoursLabel} – eWróżka`,
      context: {
        recipientName,
        wizardName,
        adTitle,
        scheduledAt,
        durationMinutes,
        meetingUrl,
        hoursLabel,
      },
    });
  }

  /** Przypomnienie o nadchodzącym spotkaniu (nieopłacone) – link do płatności */
  async sendMeetingReminderUnpaid(
    to: string,
    recipientName: string,
    wizardName: string,
    adTitle: string,
    scheduledAt: string,
    durationMinutes: number,
    priceFormatted: string,
    paymentUrl: string,
    hoursLabel: string,
    paymentHint: string,
  ): Promise<void> {
    await this.send({
      type: EmailType.MEETING_REMINDER_UNPAID,
      to,
      subject: `Opłać spotkanie za ${hoursLabel} – eWróżka`,
      context: {
        recipientName,
        wizardName,
        adTitle,
        scheduledAt,
        durationMinutes,
        priceFormatted,
        paymentUrl,
        hoursLabel,
        paymentHint,
      },
    });
  }

  /** Wiadomość z formularza kontaktowego → na contactTo (ewrozkaonline@gmail.com) */
  async sendContactForm(name: string, email: string, subject: string, message: string): Promise<void> {
    const emailCfg = this.configService.getOrThrow('email', { infer: true });
    const to = emailCfg.contactTo ?? 'ewrozkaonline@gmail.com';

    await this.send({
      type: EmailType.CONTACT_FORM,
      to,
      subject: subject ? `[eWróżka] ${subject}` : 'Wiadomość z formularza kontaktowego eWróżka',
      context: { name, email, subject: subject || '', message },
    });
  }

  async sendWizardApplicationRejected(to: string, username: string, reason?: string): Promise<void> {
    const frontendUrl = this.configService.getOrThrow('email', { infer: true }).frontendUrl;
    const applyAgainUrl = `${frontendUrl}/rejestracja/wrozka`;

    await this.send({
      type: EmailType.WIZARD_APPLICATION_REJECTED,
      to,
      subject: 'Informacja o Twoim wniosku – eWróżka',
      context: { username, reason: reason ?? null, hasReason: !!reason, applyAgainUrl },
    });
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private partialsRegistered = false;

  private registerPartials() {
    if (this.partialsRegistered) return;
    const partialsDir = path.join(__dirname, 'templates', 'partials');
    if (fs.existsSync(partialsDir)) {
      for (const file of fs.readdirSync(partialsDir)) {
        if (file.endsWith('.hbs')) {
          const name = file.replace('.hbs', '');
          const source = fs.readFileSync(path.join(partialsDir, file), 'utf8');
          handlebars.registerPartial(name, source);
        }
      }
    }
    this.partialsRegistered = true;
  }

  private async renderTemplate(
    type: EmailType,
    context: Record<string, unknown>,
  ): Promise<string> {
    this.registerPartials();

    if (!this.templateCache.has(type)) {
      const templatePath = path.join(__dirname, 'templates', `${type}.hbs`);

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Email template not found: ${templatePath}`);
      }

      const source = fs.readFileSync(templatePath, 'utf8');
      this.templateCache.set(type, handlebars.compile(source));
    }

    const compile = this.templateCache.get(type)!;
    const frontendUrl = this.configService.getOrThrow('email', { infer: true }).frontendUrl;
    return compile({ ...context, appUrl: frontendUrl });
  }
}
