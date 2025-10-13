import { Request, Response, NextFunction } from 'express';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import {
  createAppLogger,
  AppLogger,
  HttpLoggerMiddleware,
  AllExceptionsFilter,
} from './common/logger';
import { MetricsService } from './metrics/metrics.service';

async function bootstrap() {
  const startAt = Date.now();

  const winstonLogger = createAppLogger();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
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
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  const startupTimeMs = Date.now() - startAt;
  appLogger.info('Backend iniciado', {
    port,
    env: process.env.NODE_ENV || 'development',
    startupTimeMs,
  });
}
bootstrap();