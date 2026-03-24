import { SentryModule } from '@sentry/nestjs/setup';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { FastifyThrottlerGuard } from './guards/throttler.guard';
import { appConfig } from '@repo/api';
import {
  AsyncContextProvider,
  Environment,
  FastifyPinoLogger,
  RequestIdMiddleware,
} from '@repo/nest-common';
import { databaseConfig } from '@repo/postgresql-typeorm';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ApiModule } from './api/api.module';
import { HealthModule } from './health/health.module';
import authConfig from './api/auth/config/auth.config';
import paymentConfig from './config/payment.config';
import stripeConfig from './config/stripe.config';
import redisConfig from './config/redis.config';
import emailConfig from './config/email.config';
import featuredConfig from './config/featured.config';
import dailyConfig from './config/daily.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllConfigType } from './config/config.type';
// import { TypeOrmConfigService } from './database/mysql-typeorm-config.service'; // Uncomment this line if you are using MySQL
import { TypeOrmConfigService } from './database/typeorm-config.service';

const configModule = ConfigModule.forRoot({
  isGlobal: true,
  load: [appConfig, databaseConfig, authConfig, paymentConfig, stripeConfig, redisConfig, emailConfig, featuredConfig, dailyConfig],
  envFilePath: ['.env'],
});

const dbModule = TypeOrmModule.forRootAsync({
  useClass: TypeOrmConfigService,
  dataSourceFactory: async (options: DataSourceOptions) => {
    if (!options) {
      throw new Error('Invalid options passed');
    }

    return new DataSource(options).initialize();
  },
});

const i18nModule = I18nModule.forRootAsync({
  resolvers: [
    { use: QueryResolver, options: ['lang'] },
    AcceptLanguageResolver,
    new HeaderResolver(['x-lang']),
  ],
  useFactory: (configService: ConfigService<AllConfigType>) => {
    const env = configService.get('app.nodeEnv', { infer: true });
    const isLocal = env === Environment.LOCAL;
    const isDevelopment = env === Environment.DEVELOPMENT;
    return {
      fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
        infer: true,
      }),
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: isLocal,
      },
      typesOutputPath: path.join(
        __dirname,
        '../src/generated/i18n.generated.ts',
      ),
      logging: isLocal || isDevelopment, // log info on missing keys
    };
  },
  inject: [ConfigService],
});

@Module({
  imports: [
    SentryModule.forRoot(),
    configModule,
    dbModule,
    i18nModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },
      { name: 'medium', ttl: 10_000, limit: 30 },
      { name: 'long', ttl: 60_000, limit: 100 },
    ]),
    ApiModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AsyncContextProvider,
    FastifyPinoLogger,
    { provide: APP_GUARD, useClass: FastifyThrottlerGuard },
  ],
  exports: [AsyncContextProvider],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
