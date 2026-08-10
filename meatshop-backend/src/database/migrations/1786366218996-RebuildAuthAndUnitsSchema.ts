import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RebuildAuthAndUnitsSchema1786366218996
  implements MigrationInterface {
  name = 'RebuildAuthAndUnitsSchema1786366218996';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Drop old, dessynchronized tables ────────────────────────────────
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);

    // ── Enum types ───────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "users_global_role_enum" AS ENUM('SUPER_ADMIN', 'USER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "users_app_profile_enum" AS ENUM('CLIENT', 'DELIVERY', 'BOTH')`,
    );
    await queryRunner.query(
      `CREATE TYPE "user_units_local_role_enum" AS ENUM('ADMIN', 'MEMBER', 'DELIVERY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "user_units_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`,
    );

    // ── users ────────────────────────────────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "name" character varying(100) NOT NULL,
                "email" character varying NOT NULL,
                "cpf" character varying NOT NULL,
                "password_hash" character varying NOT NULL,
                "global_role" "users_global_role_enum" NOT NULL DEFAULT 'USER',
                "app_profile" "users_app_profile_enum" NOT NULL DEFAULT 'CLIENT',
                "failed_login_attempts" integer NOT NULL DEFAULT 0,
                "locked_until" TIMESTAMP,
                "email_verified" boolean NOT NULL DEFAULT false,
                "email_verification_token" character varying,
                "password_reset_token" character varying,
                "password_reset_expires_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "UQ_users_cpf" UNIQUE ("cpf"),
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);

    // ── refresh_tokens ───────────────────────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "id" SERIAL NOT NULL,
                "token_hash" text NOT NULL,
                "user_id" integer NOT NULL,
                "revoked" boolean NOT NULL DEFAULT false,
                "expires_at" TIMESTAMP NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "refresh_tokens"
            ADD CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // ── units ────────────────────────────────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "units" (
                "id" SERIAL NOT NULL,
                "name" character varying(100) NOT NULL,
                "cnpj" character varying(14) NOT NULL,
                "city" character varying(80) NOT NULL,
                "zip_code" character varying(10) NOT NULL,
                "state" character varying(2) NOT NULL,
                "admin_id" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_units_cnpj" UNIQUE ("cnpj"),
                CONSTRAINT "PK_units" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "units"
            ADD CONSTRAINT "FK_units_admin_id" FOREIGN KEY ("admin_id")
            REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

    // ── user_units ───────────────────────────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "user_units" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "unit_id" integer NOT NULL,
                "local_role" "user_units_local_role_enum" NOT NULL,
                "status" "user_units_status_enum" NOT NULL DEFAULT 'ACTIVE',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_units" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_user_units_user_id_unit_id" ON "user_units" ("user_id", "unit_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "user_units"
            ADD CONSTRAINT "FK_user_units_user_id" FOREIGN KEY ("user_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_units"
            ADD CONSTRAINT "FK_user_units_unit_id" FOREIGN KEY ("unit_id")
            REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_units" DROP CONSTRAINT "FK_user_units_unit_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_units" DROP CONSTRAINT "FK_user_units_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_units_user_id_unit_id"`,
    );
    await queryRunner.query(`DROP TABLE "user_units"`);

    await queryRunner.query(
      `ALTER TABLE "units" DROP CONSTRAINT "FK_units_admin_id"`,
    );
    await queryRunner.query(`DROP TABLE "units"`);

    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);

    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "user_units_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_units_local_role_enum"`);
    await queryRunner.query(`DROP TYPE "users_app_profile_enum"`);
    await queryRunner.query(`DROP TYPE "users_global_role_enum"`);
  }
}
