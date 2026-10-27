import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { MetricsService } from '../metrics/metrics.service';
import { PaymentLifecycleService } from './payment-lifecycle.service';

type WebhookEvent = {
  id: string;
  payment_id: string;
  unit_id: number | null;
  collector_id: string | null;
  attempts: number;
};
const MAX_ATTEMPTS = 8;
const LEASE_SECONDS = 120;

@Injectable()
export class PaymentWebhookQueueService {
  private readonly logger = new Logger(PaymentWebhookQueueService.name);
  private running = false;

  constructor(
    private readonly db: DataSource,
    private readonly lifecycle: PaymentLifecycleService,
    private readonly metrics: MetricsService,
  ) {}

  async enqueue(
    paymentId: string,
    unitId: number | null,
    collectorId: string | null,
    notificationId: string,
  ): Promise<void> {
    const key = createHash('sha256')
      .update(JSON.stringify([paymentId, unitId, collectorId, notificationId]))
      .digest('hex');
    await this.db.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`webhook:${key}`]);
      await manager.query(
        `INSERT INTO payment_webhook_events(payment_id,unit_id,collector_id,dedupe_key)
        SELECT $1::varchar(40),$2::integer,$3::varchar(40),$4::varchar(120) WHERE NOT EXISTS (
          SELECT 1 FROM payment_webhook_events WHERE dedupe_key=$4::varchar(120) AND status <> 'FAILED')`,
        [paymentId, unitId, collectorId, key],
      );
    });
  }

  @Interval(2000)
  async processDue(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (let index = 0; index < 20; index++) {
        const event = await this.claim();
        if (!event) break;
        await this.process(event);
      }
      const [row] = await this.db.query(
        "SELECT count(*)::int AS count FROM payment_webhook_events WHERE status IN ('PENDING','PROCESSING')",
      );
      this.metrics.observeWebhookQueue(row.count);
    } catch {
      this.logger.warn('Payment webhook queue maintenance failed');
    } finally {
      this.running = false;
    }
  }

  private async claim(): Promise<WebhookEvent | null> {
    const rows = await this.db.query(
      `WITH claimed AS (UPDATE payment_webhook_events SET status='PROCESSING',
      attempts=attempts+1,next_attempt_at=now()+$1*interval '1 second',updated_at=now()
      WHERE id=(SELECT id FROM payment_webhook_events WHERE status IN ('PENDING','PROCESSING')
        AND next_attempt_at<=now() ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING id,payment_id,unit_id,collector_id,attempts) SELECT * FROM claimed`,
      [LEASE_SECONDS],
    );
    return rows[0] ?? null;
  }

  private async process(event: WebhookEvent): Promise<void> {
    try {
      const unitId =
        event.unit_id ??
        (await this.lifecycle.resolveSeller(event.payment_id, event.collector_id!));
      await this.lifecycle.process(event.payment_id, unitId);
      await this.db.query(
        `UPDATE payment_webhook_events SET status='PROCESSED',processed_at=now(),
        last_error=NULL,updated_at=now() WHERE id=$1 AND attempts=$2`,
        [event.id, event.attempts],
      );
    } catch {
      this.metrics.observeWebhookFailure();
      await this.db.query(
        `UPDATE payment_webhook_events SET status=$3,next_attempt_at=now()+$4*interval '1 second',
        last_error='Payment notification processing failed',updated_at=now() WHERE id=$1 AND attempts=$2`,
        [
          event.id,
          event.attempts,
          event.attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          Math.min(3600, 2 ** event.attempts),
        ],
      );
    }
  }
}
