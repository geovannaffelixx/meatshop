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
  app.use(helmet());
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.use(cookieParser());

  const appLogger = new AppLogger(winstonLogger);

  let metricsService: MetricsService | null = null;
  try {
    metricsService = app.get(MetricsService);
    if (metricsService) {
      appLogger.info('MetricsService registrado com sucesso');
    }
  } catch {
    appLogger.warn('MetricsService não encontrado — métricas desativadas');
  }
  const httpLogger = new HttpLoggerMiddleware(appLogger, metricsService);
  app.use((req: Request, res: Response, next: NextFunction) => {
    httpLogger.use(req, res, next);
  });

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
  });
  appLogger.info('CORS e CookieParser configurados com sucesso');

  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';

  if (swaggerEnabled) {
    setupSwagger(app);
    appLogger.info('Swagger disponível em /docs');
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');

  const startupTimeMs = Date.now() - startAt;
  appLogger.info('Backend iniciado', {
    port,
    env: process.env.NODE_ENV || 'development',
    startupTimeMs,
  });
}
void bootstrap();
