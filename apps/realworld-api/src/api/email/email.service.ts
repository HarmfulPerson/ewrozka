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
      auth: {
        user: emailCfg.user,
        pass: emailCfg.pass,
      },
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
      this.logger.error(`Failed to send email [${job.type}] to ${job.to}: ${msg}`);
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
    const loginUrl = `${frontendUrl}/logowanie`;

    await this.send({
      type: EmailType.WIZARD_APPLICATION_APPROVED,
      to,
      subject: '🎉 Twoje konto wróżki zostało zatwierdzone – eWróżka',
      context: { username, loginUrl },
    });
  }

  async sendWizardApplicationRejected(
    to: string,
    username: string,
    reason: string | null,
  ): Promise<void> {
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

  private async renderTemplate(
    type: EmailType,
    context: Record<string, unknown>,
  ): Promise<string> {
    if (!this.templateCache.has(type)) {
      const templatePath = path.join(__dirname, 'templates', `${type}.hbs`);

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Email template not found: ${templatePath}`);
      }

      const source = fs.readFileSync(templatePath, 'utf8');
      this.templateCache.set(type, handlebars.compile(source));
    }

    const compile = this.templateCache.get(type)!;
    return compile(context);
  }
}
