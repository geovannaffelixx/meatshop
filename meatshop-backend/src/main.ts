import { PostgresIoAdapter } from './common/adapters/postgres-io.adapter';
import type { Request, Response, NextFunction } from 'express';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import {
  createAppLogger,
  AppLogger,
  HttpLoggerMiddleware,
  AllExceptionsFilter,
} from './common/logger';
import { MetricsService } from './metrics/metrics.service';
import { setupSwagger } from './config/swagger.config';
import { join } from 'path';
import helmet from 'helmet';
import { getAllowedOrigins, validateEnvironment } from './config/runtime-config';

async function bootstrap() {
  validateEnvironment(process.env);
  const startAt = Date.now();

  const winstonLogger = createAppLogger();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureServer(app);
  const appLogger = new AppLogger(winstonLogger);

  configureLogging(app, appLogger);
  configureValidation(app);
  appLogger.info('CORS and CookieParser configured successfully');
  configureDocumentation(app, appLogger);
  await configureRealtime(app);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');

  const startupTimeMs = Date.now() - startAt;
  appLogger.info('Backend iniciado', {
    port,
    env: process.env.NODE_ENV || 'development',
    startupTimeMs,
  });
}
function configureServer(app: NestExpressApplication): void {
  app.use(helmet());
  // Uploaded images are also displayed by the separately hosted frontend.
  app.use('/uploads', helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.use(cookieParser());
}

function configureLogging(app: NestExpressApplication, appLogger: AppLogger): void {
  let metricsService: MetricsService | null = null;
  try {
    metricsService = app.get(MetricsService);
    if (metricsService) {
      appLogger.info('MetricsService registered successfully');
    }
  } catch {
    appLogger.warn('MetricsService not found - metrics disabled');
  }
  const httpLogger = new HttpLoggerMiddleware(appLogger, metricsService);
  app.use((req: Request, res: Response, next: NextFunction) => {
    httpLogger.use(req, res, next);
  });
}

function configureValidation(app: NestExpressApplication): void {
  app.useGlobalFilters(app.get(AllExceptionsFilter));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: getAllowedOrigins(process.env),
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'x-csrf-token',
      'x-client-platform',
      'x-firebase-appcheck',
      'x-request-id',
    ],
  });
}

function configureDocumentation(app: NestExpressApplication, appLogger: AppLogger): void {
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';

  if (swaggerEnabled) {
    setupSwagger(app);
    appLogger.info('Swagger available at /docs');
  }
}

async function configureRealtime(app: NestExpressApplication): Promise<void> {
  if (process.env.SOCKET_IO_SHARED === 'true') {
    const adapter = new PostgresIoAdapter(app);
    await adapter.initialize();
    app.useWebSocketAdapter(adapter);
  }
}

void bootstrap();
