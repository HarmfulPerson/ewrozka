import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';
import { AllConfigType } from '@/config/config.type';

@Injectable()
export class RedisHealthIndicator
  extends HealthIndicator
  implements OnModuleInit, OnModuleDestroy
{
  private redis: Redis | null = null;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    super();
  }

  async onModuleInit() {
    const url = this.configService.get('redis.url', { infer: true });
    if (url && url !== '') {
      this.redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
      await this.redis.connect().catch(() => {
        this.redis = null;
      });
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.redis) {
      throw new HealthCheckError('Redis not connected', this.getStatus(key, false));
    }

    try {
      const pong = await this.redis.ping();
      if (pong === 'PONG') {
        return this.getStatus(key, true);
      }
      throw new Error(`Unexpected response: ${pong}`);
    } catch (error) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
