import { registerAs } from '@nestjs/config';
import { StripeConfig } from './config.type';

export default registerAs<StripeConfig>('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  connectReturnUrl: process.env.STRIPE_CONNECT_RETURN_URL || 'http://localhost:3000/panel/portfel',
  connectRefreshUrl: process.env.STRIPE_CONNECT_REFRESH_URL || 'http://localhost:3000/panel/portfel',
}));
