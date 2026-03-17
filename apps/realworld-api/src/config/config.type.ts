import { AuthConfig } from '@/api/auth/config/auth-config.type';
import { AppConfig } from '@repo/api';
import { DatabaseConfig } from '@repo/postgresql-typeorm';
import type { DailyConfig } from './daily.config';
import type { EmailConfig } from './email.config';
import type { FeaturedConfig } from './featured.config';
import type { RedisConfig } from './redis.config';

export type PaymentConfig = {
  platformFeePercentage: number;
  currency: string;
};

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
  publishableKey: string;
  frontendUrl: string;
  connectReturnUrl: string;
  connectRefreshUrl: string;
  /** Waluta transakcji Stripe — 'eur' w non-prod (instant payouts), 'pln' w prod */
  currency: string;
  /** Czy używać instant payouts (tylko EUR, non-prod) */
  instantPayouts: boolean;
};

export type AllConfigType = {
  app: AppConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  payment: PaymentConfig;
  stripe: StripeConfig;
  email: EmailConfig;
  featured: FeaturedConfig;
  daily: DailyConfig;
  redis: RedisConfig;
};
