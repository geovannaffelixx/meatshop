import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { PaymentLifecycleService } from '../payments/payment-lifecycle.service';
import { MetricsService } from '../metrics/metrics.service';

export type PaymentWebhookNotification = {
  paymentId: string;
  unitId: number | null;
  collectorId: string | null;
};

type ClaimedWebhookEvent = {
  id: string;
  payment_id: string;
  unit_id: number | null;
  collector_id: string | null;
  attempts: number;
};

export const WEBHOOK_POLL_INTERVAL_MS = 5_000;
export const WEBHOOK_BATCH_SIZE = 20;
export const WEBHOOK_MAX_ATTEMPTS = 8;
export const WEBHOOK_LEASE_SECONDS = 120;
export const WEBHOOK_BASE_BACKOFF_SECONDS = 30;
export const WEBHOOK_MAX_BACKOFF_SECONDS = 3_600;
export const WEBHOOK_RETENTION_DAYS = 7;
const ERROR_MAX_LENGTH = 255;

export const webhookBackoffSeconds = (attempts: number): number =>
  Math.min(
    WEBHOOK_MAX_BACKOFF_SECONDS,
    WEBHOOK_BASE_BACKOFF_SECONDS * 2 ** Math.max(0, attempts - 1),
  );

@Injectable()
export class PaymentWebhookQueueService {
  private readonly logger = new Logger(PaymentWebhookQueueService.name);
  private draining = false;

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly lifecycle: PaymentLifecycleService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  async enqueue(notification: PaymentWebhookNotification): Promise<void> {
    const dedupeKey = [
      notification.paymentId,
      notification.unitId ?? '',
      notification.collectorId ?? '',
    ].join(':');
    await this.db.query(
      `INSERT INTO payment_webhook_events(payment_id,unit_id,collector_id,dedupe_key)
      SELECT $1::varchar,$2::integer,$3::varchar,$4::varchar
      WHERE NOT EXISTS (SELECT 1 FROM payment_webhook_events WHERE dedupe_key=$4::varchar AND status='PENDING' AND attempts=0)`,
      [notification.paymentId, notification.unitId, notification.collectorId, dedupeKey],
    );
  }

  @Interval(WEBHOOK_POLL_INTERVAL_MS)
  async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      for (const event of await this.claim()) await this.handle(event);
      await this.purgeProcessed();
      await this.refreshPendingGauge();
    } catch (error) {
      this.logger.error(
        'Payment webhook queue processing failed',
        error instanceof Error ? error.message : 'unknown',
      );
    } finally {
      this.draining = false;
    }
  }

  private async claim(): Promise<ClaimedWebhookEvent[]> {
    const [rows] = (await this.db.query(
      `UPDATE payment_webhook_events SET status='PROCESSING',attempts=attempts+1,
      next_attempt_at=now()+($2::int * interval '1 second'),updated_at=now()
      WHERE id IN (SELECT id FROM payment_webhook_events WHERE status IN ('PENDING','PROCESSING') AND next_attempt_at<=now()
      ORDER BY next_attempt_at,id LIMIT $1 FOR UPDATE SKIP LOCKED)
      RETURNING id,payment_id,unit_id,collector_id,attempts`,
      [WEBHOOK_BATCH_SIZE, WEBHOOK_LEASE_SECONDS],
    )) as [ClaimedWebhookEvent[], number];
    return rows;
  }

  private async handle(event: ClaimedWebhookEvent): Promise<void> {
    try {
      const unitId =
        event.unit_id ??
        (await this.lifecycle.resolveSeller(event.payment_id, event.collector_id ?? ''));
      await this.lifecycle.process(event.payment_id, unitId);
      await this.db.query(
        "UPDATE payment_webhook_events SET status='PROCESSED',processed_at=now(),last_error=NULL,updated_at=now() WHERE id=$1",
        [event.id],
      );
    } catch (error) {
      await this.recordFailure(event, error);
    }
  }

  private async recordFailure(event: ClaimedWebhookEvent, error: unknown): Promise<void> {
    this.metrics?.observeWebhookFailure();
    const exhausted = event.attempts >= WEBHOOK_MAX_ATTEMPTS;
    const message = (error instanceof Error ? error.message : 'Unknown failure').slice(
      0,
      ERROR_MAX_LENGTH,
    );
    await this.db.query(
      `UPDATE payment_webhook_events SET status=$2::varchar,last_error=$3,
      next_attempt_at=now()+($4::int * interval '1 second'),updated_at=now() WHERE id=$1`,
      [event.id, exhausted ? 'FAILED' : 'PENDING', message, webhookBackoffSeconds(event.attempts)],
    );
    if (exhausted)
      this.logger.error(
        `Payment notification ${event.id} moved to FAILED after ${event.attempts} attempts`,
      );
    else this.logger.warn(`Payment notification ${event.id} will be retried`);
  }

  private async purgeProcessed(): Promise<void> {
    await this.db.query(
      "DELETE FROM payment_webhook_events WHERE status='PROCESSED' AND processed_at < now()-($1::int * interval '1 day')",
      [WEBHOOK_RETENTION_DAYS],
    );
  }

  private async refreshPendingGauge(): Promise<void> {
    const [row] = await this.db.query(
      "SELECT COUNT(*)::int AS pending FROM payment_webhook_events WHERE status IN ('PENDING','PROCESSING')",
    );
    this.metrics?.observeWebhookQueue(Number(row?.pending ?? 0));
  }
}
