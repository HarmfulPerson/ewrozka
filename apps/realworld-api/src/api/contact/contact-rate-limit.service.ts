import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AllConfigType } from '@/config/config.type';

const KEY_PREFIX = 'contact:rate:';
const WINDOW_SECONDS = 3600; // 1 godzina
const MAX_REQUESTS = 3;

@Injectable()
export class ContactRateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContactRateLimitService.name);
  private redis: Redis | null = null;

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  async onModuleInit() {
    const url = this.configService.get('redis.url', { infer: true });
    if (!url || url === '') {
      this.logger.warn(
        'REDIS_URL nie ustawiony - rate limiting formularza kontaktowego wylaczony. Ustaw REDIS_URL w .env (np. redis://:redispass@localhost:6379)',
      );
      return;
    }

    try {
      const password = this.configService.get('redis.password', { infer: true });
      this.redis = new Redis(url, {
        password: password || undefined,
        maxRetriesPerRequest: 2,
        retryStrategy: () => null,
        lazyConnect: true,
      });
      await this.redis.connect();
      this.logger.log('Redis polaczony - rate limiting formularza kontaktowego aktywny');
    } catch (err) {
      this.logger.warn(
        `Redis niedostepny - rate limiting wylaczony: ${err instanceof Error ? err.message : String(err)}`,
      );
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }

  /**
   * Sprawdza i inkrementuje licznik dla danego IP.
   * @throws ThrottlerException gdy przekroczono limit (3 zgłoszenia/godzinę)
   */
  async checkAndIncrement(ip: string): Promise<void> {
    if (!this.redis) return;

    const key = `${KEY_PREFIX}${ip}`;

    try {
      const multi = this.redis.multi();
      multi.incr(key);
      multi.expire(key, WINDOW_SECONDS);
      const results = await multi.exec();

      if (!results) return;

      const count = results[0]?.[1];
      if (typeof count === 'number' && count > MAX_REQUESTS) {
        await this.redis.decr(key);
        throw new HttpException(
          `Maksymalnie ${MAX_REQUESTS} zgłoszenia z formularza kontaktowego na godzinę. Spróbuj ponownie później.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.warn(
        `Blad Redis rate limit (fail open): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
