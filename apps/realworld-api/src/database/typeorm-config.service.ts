import { AllConfigType } from '@/config/config.type';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { TypeOrmCustomLogger } from '@repo/postgresql-typeorm';
import { join } from 'path';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService<AllConfigType>) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const modulePath = require.resolve('@repo/postgresql-typeorm');
    const nodeModulesDir = join(modulePath, '..', '..');

    return {
      type: this.configService.get('database.type', { infer: true }) as any,
      host: this.configService.get('database.host', { infer: true }) as any,
      port: this.configService.get('database.port', { infer: true }) as any,
      username: this.configService.get('database.username', { infer: true }) as any,
      password: this.configService.get('database.password', { infer: true }) as any,
      database: this.configService.get('database.name', { infer: true }) as any,
      synchronize: this.configService.get('database.synchronize', {
        infer: true,
      }) as any,
      dropSchema: false,
      keepConnectionAlive: true,
      // Only use logging or logger
      // logging: this.configService.get('database.logging', { infer: true }),
      logger: TypeOrmCustomLogger.getInstance(
        'default',
        this.configService.get('database.logging', { infer: true }) as any
          ? ['error', 'warn', 'query', 'schema']
          : ['error', 'warn'],
      ),
      entities: [join(nodeModulesDir, 'dist', '**', '*.entity.{ts,js}')],
      poolSize: this.configService.get('database.maxConnections', {
        infer: true,
      }) as any,
      ssl: this.configService.get('database.sslEnabled', { infer: true }) as any
        ? {
            rejectUnauthorized: this.configService.get(
              'database.rejectUnauthorized',
              { infer: true },
            ) as any,
            ca:
              (this.configService.get('database.ca', { infer: true }) as any) ??
              undefined,
            key:
              (this.configService.get('database.key', { infer: true }) as any) ??
              undefined,
            cert:
              (this.configService.get('database.cert', { infer: true }) as any) ??
              undefined,
          }
        : undefined,
    } as unknown as TypeOrmModuleOptions;
  }
}
