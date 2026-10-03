import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: Registry;

  private readonly httpRequestsTotal: Counter;

  private readonly httpRequestDuration: Histogram;
  private readonly trackingSamples: Counter;
  private readonly trackingAge: Histogram;
  private readonly trackingPurged: Counter;

  constructor() {
    this.register = new Registry();

    collectDefaultMetrics({ register: this.register });
    this.trackingSamples = new Counter({
      name: 'delivery_tracking_samples_total',
      help: 'GPS requests by outcome without personal data',
      labelNames: ['outcome'],
      registers: [this.register],
    });
    this.trackingAge = new Histogram({
      name: 'delivery_tracking_capture_age_seconds',
      help: 'Age of accepted GPS samples at persistence',
      buckets: [1, 5, 10, 20, 30, 60],
      registers: [this.register],
    });
    this.trackingPurged = new Counter({
      name: 'delivery_tracking_purged_total',
      help: 'Expired tracking records deleted',
      registers: [this.register],
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests received',
      labelNames: ['method', 'route', 'status_code'],
    });
    this.register.registerMetric(this.httpRequestsTotal);

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
    });
    this.register.registerMetric(this.httpRequestDuration);
  }

  incrementHttpRequests(method = 'GET', route = 'unknown', statusCode = 200): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
  }

  observeHttpLatency(method: string, route: string, durationMs: number, statusCode: number): void {
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, durationMs);
  }

  observeTracking(outcome: string, ageSeconds?: number): void {
    this.trackingSamples.inc({ outcome });
    if (ageSeconds != null) this.trackingAge.observe(Math.max(0, ageSeconds));
  }

  observeTrackingPurge(count: number): void {
    this.trackingPurged.inc(count);
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}
