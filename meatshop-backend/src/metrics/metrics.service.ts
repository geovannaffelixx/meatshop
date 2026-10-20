import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Registry, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: Registry;

  private readonly httpRequestsTotal: Counter;

  private readonly httpRequestDuration: Histogram;
  private readonly trackingSamples: Counter;
  private readonly trackingAge: Histogram;
  private readonly trackingPurged: Counter;
  private readonly refundQueue: Gauge;
  private readonly oldestRefund: Gauge;
  private readonly paymentMaintenance: Gauge;
  private readonly aiRequests: Counter;
  private readonly aiDuration: Histogram;
  private readonly aiDraftFeedback: Counter;
  private readonly aiConversationsPurged: Counter;

  constructor() {
    this.register = new Registry();
    this.refundQueue = new Gauge({
      name: 'payment_refund_queue',
      help: 'Refunds requiring processing or financial intervention',
      labelNames: ['status'],
      registers: [this.register],
    });
    this.oldestRefund = new Gauge({
      name: 'payment_oldest_pending_refund_seconds',
      help: 'Age of the oldest pending refund',
      registers: [this.register],
    });
    this.paymentMaintenance = new Gauge({
      name: 'payment_maintenance_last_success_timestamp_seconds',
      help: 'Most recent successful payment maintenance',
      registers: [this.register],
    });
    this.paymentMaintenance.set(Date.now() / 1000);

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
    this.aiRequests = new Counter({
      name: 'ai_requests_total',
      help: 'AI requests by operation and outcome without prompt content',
      labelNames: ['operation', 'outcome'],
      registers: [this.register],
    });
    this.aiDuration = new Histogram({
      name: 'ai_request_duration_ms',
      help: 'AI request duration by operation and outcome',
      labelNames: ['operation', 'outcome'],
      buckets: [100, 250, 500, 1000, 2000, 5000, 10000, 30000, 60000],
      registers: [this.register],
    });
    this.aiDraftFeedback = new Counter({
      name: 'ai_recipe_draft_feedback_total',
      help: 'Recipe draft decisions after human review',
      labelNames: ['action'],
      registers: [this.register],
    });
    this.aiConversationsPurged = new Counter({
      name: 'ai_conversations_purged_total',
      help: 'Expired AI conversations deleted after the retention period',
      registers: [this.register],
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests received',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
      registers: [this.register],
    });
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

  observeAiRequest(operation: string, outcome: string, durationMs: number): void {
    this.aiRequests.inc({ operation, outcome });
    this.aiDuration.observe({ operation, outcome }, durationMs);
  }

  observeAiDraftFeedback(action: string): void {
    this.aiDraftFeedback.inc({ action });
  }

  observeAiConversationPurge(count: number): void {
    this.aiConversationsPurged.inc(count);
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  observePayments(pending: number, failed: number, age: number) {
    this.refundQueue.set({ status: 'PENDING' }, pending);
    this.refundQueue.set({ status: 'FAILED' }, failed);
    this.oldestRefund.set(age);
    this.paymentMaintenance.set(Date.now() / 1000);
  }
}
