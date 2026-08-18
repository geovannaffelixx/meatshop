import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsSchema1787061294468 implements MigrationInterface {
  name = 'CreateAuditLogsSchema1787061294468';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "audit_logs" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "action" character varying(50) NOT NULL,
                "entity" character varying(100) NOT NULL,
                "entity_id" character varying(50),
                "old_data" text,
                "new_data" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "audit_logs"
            ADD CONSTRAINT "FK_audit_logs_user_id" FOREIGN KEY ("user_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_entity_entity_id" ON "audit_logs" ("entity", "entity_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_entity_entity_id"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
