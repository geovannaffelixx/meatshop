import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { AppLogger } from '../logger/logger.service';
import { MetricsService } from '../../metrics/metrics.service';

type RequestWithContext = Request & {
  correlationId?: string;
  user?: { id?: number };
};

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly baseLogger: AppLogger,
    private readonly metricsService: MetricsService | null = null,
  ) {}

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const correlationId = req.headers['x-correlation-id']?.toString() || randomUUID();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    const logger = this.baseLogger.child({ correlationId });
    const start = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const statusCode = res.statusCode;

      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        statusCode,
        durationMs,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        userId: req.user?.id,
      });

      try {
        const route = req.route?.path ?? req.path;
        this.metricsService?.incrementHttpRequests(req.method, route, statusCode);
        this.metricsService?.observeHttpLatency(req.method, route, durationMs, statusCode);
      } catch (error: unknown) {
        logger.warn('Falha ao incrementar métricas', {
          error: error instanceof Error ? error.message : 'Unknown metrics error',
        });
      }
    });

    next();
  }
}
