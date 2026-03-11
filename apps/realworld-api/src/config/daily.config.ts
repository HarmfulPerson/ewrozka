import { registerAs } from '@nestjs/config';

export type DailyConfig = {
  apiKey: string;
  domain: string;
};

export default registerAs<DailyConfig>('daily', () => ({
  apiKey: process.env.DAILY_API_KEY ?? '',
  domain: process.env.DAILY_DOMAIN ?? '',
}));
