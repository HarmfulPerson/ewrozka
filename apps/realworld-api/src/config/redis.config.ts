import { registerAs } from '@nestjs/config';

export type RedisConfig = {
  /** URL Redis (np. redis://localhost:6379). Gdy puste, Redis jest wyłączony. */
  url: string;
  /** Hasło Redis (opcjonalne, można też w URL: redis://:pass@host:6379) */
  password?: string;
};

export default registerAs<RedisConfig>('redis', () => ({
  url: process.env.REDIS_URL || '',
  password: process.env.REDIS_PASSWORD,
}));
