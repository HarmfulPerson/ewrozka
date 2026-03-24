import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    integrations: [nodeProfilingIntegration()],

    // Send structured logs to Sentry
    enableLogs: true,

    // Tracing — 100% in dev, 20% in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Profiling — trace lifecycle automatically profiles active traces
    profileSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profileLifecycle: 'trace',

    sendDefaultPii: false,
  });
}
