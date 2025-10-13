import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Registry,
  Counter,
  Histogram,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: Registry;
  
  private readonly httpRequestsTotal: Counter;

  private readonly httpRequestDuration: Histogram;

  constructor() {
    this.register = new Registry();

    collectDefaultMetrics({ register: this.register });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Número total de requisições HTTP recebidas',
      labelNames: ['method', 'route', 'status_code'],
    });
    this.register.registerMetric(this.httpRequestsTotal);

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_ms',
      help: 'Duração das requisições HTTP em milissegundos',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
    });
    this.register.registerMetric(this.httpRequestDuration);
  }

  incrementHttpRequests(
    method = 'GET',
    route = 'unknown',
    statusCode = 200,
  ): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
  }

  observeHttpLatency(
    method: string,
    route: string,
    durationMs: number,
    statusCode: number,
  ): void {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      durationMs,
    );
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}