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
import { join } from 'path';

async function bootstrap() {
  const startAt = Date.now();

  const winstonLogger = createAppLogger();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.use(cookieParser());

  const appLogger = new AppLogger(winstonLogger);

  let metricsService: MetricsService | null = null;
  try {
    metricsService = app.get(MetricsService);
    if (metricsService) {
      app.set('MetricsService', metricsService);
      appLogger.info('MetricsService registrado com sucesso');
    }
  } catch {
    appLogger.warn('MetricsService não encontrado — métricas desativadas');
  }
  const httpLogger = new HttpLoggerMiddleware(appLogger);
  app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).metricsService = metricsService;
    httpLogger.use(req, res, next);
  });

  app.useGlobalFilters(new AllExceptionsFilter(appLogger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL]
      : [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    credentials: true,
  });
  appLogger.info('CORS e CookieParser configurados com sucesso');

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
