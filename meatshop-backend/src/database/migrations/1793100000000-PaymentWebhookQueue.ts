import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentWebhookQueue1793100000000 implements MigrationInterface {
  name = 'PaymentWebhookQueue1793100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE payment_webhook_events (
      id bigserial PRIMARY KEY,
      payment_id varchar(40) NOT NULL,
      unit_id integer NULL,
      collector_id varchar(40) NULL,
      dedupe_key varchar(120) NOT NULL,
      status varchar(12) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','PROCESSING','PROCESSED','FAILED')),
      attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      last_error varchar(255) NULL,
      processed_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT CHK_payment_webhook_events_seller CHECK (unit_id IS NOT NULL OR collector_id IS NOT NULL)
    )`);
    await queryRunner.query(
      "CREATE INDEX IDX_payment_webhook_events_due ON payment_webhook_events(next_attempt_at, id) WHERE status IN ('PENDING','PROCESSING')",
    );
    await queryRunner.query(
      "CREATE INDEX IDX_payment_webhook_events_dedupe ON payment_webhook_events(dedupe_key) WHERE status='PENDING'",
    );
    await queryRunner.query(
      "CREATE INDEX IDX_payment_webhook_events_retention ON payment_webhook_events(processed_at) WHERE status='PROCESSED'",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS payment_webhook_events');
  }
}
