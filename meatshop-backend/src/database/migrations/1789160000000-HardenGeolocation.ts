import type { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenGeolocation1789160000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    if (!q.isTransactionActive)
      throw new Error('Geolocation privacy migration requires a transaction');
    await q.query(`ALTER TABLE orders
      ADD COLUMN destination_snapshot jsonb NULL,
      ADD COLUMN tracking_session_id uuid NULL,
      ADD COLUMN tracking_consent_user_id integer NULL,
      ADD COLUMN tracking_consent_at timestamptz NULL,
      ADD COLUMN tracking_revoked_at timestamptz NULL`);
    await q.query(`UPDATE orders o SET destination_snapshot = jsonb_build_object(
      'street',a.street,'number',a.number,'complement',a.complement,'neighborhood',a.neighborhood,
      'city',a.city,'state',a.state,'zip_code',a.zip_code,'latitude',a.latitude,'longitude',a.longitude,
      'coordinate_source','POSTAL_CODE') FROM addresses a WHERE a.id=o.address_id`);
    await q.query(
      `ALTER TABLE addresses ADD COLUMN coordinate_source varchar(20) NOT NULL DEFAULT 'POSTAL_CODE'`,
    );
    await q.query(`ALTER TABLE units ADD COLUMN coordinate_source varchar(20) NOT NULL DEFAULT 'POSTAL_CODE',
      ADD COLUMN delivery_radius_km numeric(7,2) NOT NULL DEFAULT 25`);
    await q.query(`ALTER TABLE delivery_tracking ADD COLUMN delivery_person_id integer NULL,
      ADD COLUMN sample_id uuid NULL, ADD COLUMN captured_at timestamptz NULL`);
    await q.query(
      `CREATE UNIQUE INDEX IDX_tracking_sample ON delivery_tracking(order_id, sample_id) WHERE sample_id IS NOT NULL`,
    );
    await q.query(`CREATE INDEX IDX_tracking_retention ON delivery_tracking(created_at)`);
    // Tracking has a separate retention policy. Historical payloads are deliberately redacted;
    // actor, outcome and event metadata remain available for audit.
    // ALTER TABLE holds an exclusive lock until commit, preventing concurrent writes
    // from bypassing the append-only guard during this one-time privacy redaction.
    await q.query('ALTER TABLE audit_logs DISABLE TRIGGER "TRG_audit_logs_append_only"');
    await q.query(`UPDATE audit_logs SET old_data = NULL, new_data = NULL
      WHERE path LIKE '/delivery/orders/%/location'
      OR COALESCE(old_data,'') ~ '"(latitude|longitude|dest_lat|dest_lng|unit_lat|unit_lng)"'
      OR COALESCE(new_data,'') ~ '"(latitude|longitude|dest_lat|dest_lng|unit_lat|unit_lng)"'`);
    await q.query('ALTER TABLE audit_logs ENABLE TRIGGER "TRG_audit_logs_append_only"');
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP INDEX IDX_tracking_retention');
    await q.query('DROP INDEX IDX_tracking_sample');
    await q.query(
      'ALTER TABLE delivery_tracking DROP COLUMN captured_at, DROP COLUMN sample_id, DROP COLUMN delivery_person_id',
    );
    await q.query(
      'ALTER TABLE units DROP COLUMN coordinate_source, DROP COLUMN delivery_radius_km',
    );
    await q.query('ALTER TABLE addresses DROP COLUMN coordinate_source');
    await q.query(
      'ALTER TABLE orders DROP COLUMN destination_snapshot, DROP COLUMN tracking_session_id, DROP COLUMN tracking_consent_user_id, DROP COLUMN tracking_consent_at, DROP COLUMN tracking_revoked_at',
    );
  }
}
