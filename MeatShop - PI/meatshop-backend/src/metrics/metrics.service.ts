import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Registry, Counter } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: Registry;
  private readonly httpRequestsTotal: Counter;

  constructor() {
    this.register = new Registry();
    collectDefaultMetrics({ register: this.register });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Número total de requisições HTTP',
    });

    this.register.registerMetric(this.httpRequestsTotal);
  }

  incrementHttpRequests() {
    this.httpRequestsTotal.inc();
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}