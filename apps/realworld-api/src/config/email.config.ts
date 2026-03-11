import { registerAs } from '@nestjs/config';

export type EmailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  frontendUrl: string;
};

export default registerAs<EmailConfig>('email', () => ({
  host: process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.MAIL_PORT || '2525', 10),
  user: process.env.MAIL_USER ?? '',
  pass: process.env.MAIL_PASS ?? '',
  from: process.env.MAIL_FROM || 'noreply@ewrozka.pl',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000',
}));
