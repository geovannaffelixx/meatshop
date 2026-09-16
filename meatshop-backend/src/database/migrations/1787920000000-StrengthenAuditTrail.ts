import type { MigrationInterface, QueryRunner } from 'typeorm';

export class StrengthenAuditTrail1787920000000 implements MigrationInterface {
  name = 'StrengthenAuditTrail1787920000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const auditLogsTable = await queryRunner.getTable('audit_logs');
    const userForeignKey = auditLogsTable?.foreignKeys.find((foreignKey) =>
      foreignKey.columnNames.includes('user_id'),
    );

    if (userForeignKey) {
      await queryRunner.dropForeignKey('audit_logs', userForeignKey);
    }
    await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(`CREATE TYPE "audit_logs_outcome_enum" AS ENUM('SUCCESS','FAILURE')`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "unit_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "actor_type" character varying(20) NOT NULL DEFAULT 'USER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "actor_identifier" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "description" character varying(255) NOT NULL DEFAULT 'Evento legado'`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "outcome" "audit_logs_outcome_enum" NOT NULL DEFAULT 'SUCCESS'`,
    );
    for (const column of [
      'method character varying(10)',
      'path character varying(255)',
      'correlation_id character varying(64)',
      'ip_address character varying(64)',
      'user_agent character varying(255)',
    ]) {
      const [name, ...type] = column.split(' ');
      await queryRunner.query(`ALTER TABLE "audit_logs" ADD "${name}" ${type.join(' ')}`);
    }
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "status_code" integer`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_unit_id" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_outcome_created" ON "audit_logs" ("outcome", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_unit_created" ON "audit_logs" ("unit_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END; $$ LANGUAGE plpgsql`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "TRG_audit_logs_append_only" BEFORE UPDATE OR DELETE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation()`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER "TRG_audit_logs_append_only" ON "audit_logs"`);
    await queryRunner.query(`DROP FUNCTION prevent_audit_log_mutation()`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_unit_created"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_outcome_created"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_unit_id"`);
    for (const column of [
      'status_code',
      'user_agent',
      'ip_address',
      'correlation_id',
      'path',
      'method',
      'outcome',
      'description',
      'actor_identifier',
      'actor_type',
      'unit_id',
    ])
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "${column}"`);
    await queryRunner.query(`DROP TYPE "audit_logs_outcome_enum"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_user_id"`);
    await queryRunner.query(`DELETE FROM "audit_logs" WHERE "user_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "user_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }
}
