import compression from '@fastify/compress';
import helmet from '@fastify/helmet';
import staticPlugin from '@fastify/static';
import {
  ClassSerializerInterceptor,
  HttpStatus,
  RequestMethod,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  AsyncContextProvider,
  FastifyLoggerEnv,
  FastifyPinoLogger,
  fastifyPinoOptions,
  genReqId,
  REQUEST_ID_HEADER,
} from '@repo/nest-common';
import dotenv from 'dotenv';
import { contentParser } from 'fastify-file-interceptor';
import * as path from 'path';
import { AuthService } from './api/auth/auth.service';
import { AppModule } from './app.module';
import { AllConfigType } from './config/config.type';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { setupSwagger } from './utils/setup-swagger';



function getCorsOrigin(): string | string[] | boolean {

  const corsOrigin = process.env.APP_CORS_ORIGIN;

  if (corsOrigin === 'true') return true;

  if (corsOrigin === '*') return '*';

  if (!corsOrigin || corsOrigin === 'false') return false;

  return corsOrigin.split(',').map((origin) => origin.trim());

}



async function bootstrap() {

  dotenv.config();



  const corsOrigin = getCorsOrigin();

  const fastifyAdapter = new FastifyAdapter({

    requestIdHeader: REQUEST_ID_HEADER,

    genReqId: genReqId(),

    logger: fastifyPinoOptions(process.env.NODE_ENV as FastifyLoggerEnv),

    // Required for Stripe webhook signature verification
    bodyLimit: 10485760,

  });



  fastifyAdapter.enableCors({

    origin: corsOrigin,

    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],

    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],

    credentials: true,

    optionsSuccessStatus: 204,

  });



  const app = await NestFactory.create<NestFastifyApplication>(

    AppModule,

    fastifyAdapter,

    {

      bufferLogs: true,

    },

  );



  // Configure the logger

  const asyncContext = app.get(AsyncContextProvider);

  const logger = new FastifyPinoLogger(

    asyncContext,

    fastifyAdapter.getInstance().log,

  );

  app.useLogger(logger);



  fastifyAdapter.getInstance().addHook('onRequest', (request, reply, done) => {

    asyncContext.run(() => {

      asyncContext.set('log', request.log);

      done();

    }, new Map());

  });

  // Save raw body for Stripe webhook signature verification
  fastifyAdapter.getInstance().addHook('preParsing', (_req: any, _reply: any, payload: any, done: any) => {
    const chunks: Buffer[] = [];
    payload.on('data', (chunk: Buffer) => chunks.push(chunk));
    payload.on('end', () => {
      (_req as any).rawBody = Buffer.concat(chunks);
    });
    done(null, payload);
  });



  // Setup security headers
  app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  });

  // For high-traffic websites in production, it is strongly recommended to offload compression from the application server - typically in a reverse proxy (e.g., Nginx). In that case, you should not use compression middleware.
  app.register(compression);

  // Register @fastify/multipart for file uploads
  const multipart = await import('@fastify/multipart');
  await app.register(multipart.default, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });

  // Serve uploaded files statically
  await app.register(staticPlugin, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  });



  const configService = app.get(ConfigService<AllConfigType>);

  const reflector = app.get(Reflector);



  logger.log(

    `CORS Origin: ${typeof corsOrigin === 'object' ? corsOrigin.join(', ') : String(corsOrigin)}`,

  );



  // Use global prefix if you don't have subdomain

  app.setGlobalPrefix(

    configService.getOrThrow('app.apiPrefix', { infer: true }),

    {

      exclude: [

        // { method: RequestMethod.GET, path: '/' }, // Middeware not working when using exclude by root path https://github.com/nestjs/nest/issues/13401

        { method: RequestMethod.GET, path: 'health' },

      ],

    },

  );



  app.enableVersioning({

    type: VersioningType.URI,

  });



  app.useGlobalGuards(
    new AuthGuard(reflector, app.get(AuthService)),
    new RolesGuard(reflector),
  );

  app.useGlobalFilters(

    new GlobalExceptionFilter(

      app.get(HttpAdapterHost),

      configService.getOrThrow('app.debug', { infer: true }),

    ),

  );

  app.useGlobalPipes(

    new ValidationPipe({

      transform: true,

      whitelist: true,

      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,

      exceptionFactory: (errors: ValidationError[]) => {

        return new UnprocessableEntityException(errors);

      },

    }),

  );



  app.useGlobalInterceptors(

    new ClassSerializerInterceptor(reflector, {

      excludeExtraneousValues: true,

    }),

  );



  if (configService.getOrThrow('app.apiDocsEnabled', { infer: true })) {

    setupSwagger(app);

  }



  await app.listen(

    configService.getOrThrow('app.port', { infer: true }) as number,

    '0.0.0.0',

  );

}



bootstrap();

