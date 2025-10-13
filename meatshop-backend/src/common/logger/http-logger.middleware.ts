import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AppLogger } from './logger.service';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  constructor(private readonly baseLogger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id']?.toString() || randomUUID();
    (req as any).correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    const logger = this.baseLogger.child({ correlationId });
    const start = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const statusCode = res.statusCode;

      logger.info('HTTP Request', {
        method: req.method,
        path: (req as any).originalUrl || req.url,
        statusCode,
        durationMs,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });

      try {
        const metricsService = (req.app.get('MetricsService') as any);
        metricsService?.incrementHttpRequests?.();

      } catch (err: any) {
        logger.warn('Falha ao incrementar métricas', { error: err?.message });
      }
    });

    next();
  }
}