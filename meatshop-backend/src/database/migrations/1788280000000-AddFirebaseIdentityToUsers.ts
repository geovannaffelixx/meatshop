import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFirebaseIdentityToUsers1788280000000 implements MigrationInterface {
  name = 'AddFirebaseIdentityToUsers1788280000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "firebase_uid" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "phone" character varying`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "profile_complete" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "is_active" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "cpf" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "app_profile" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "app_profile" DROP NOT NULL`);
    await queryRunner.query(`UPDATE "users" SET "profile_complete" = true`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_firebase_uid" ON "users" ("firebase_uid") WHERE "firebase_uid" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_phone" ON "users" ("phone") WHERE "phone" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_users_phone"`);
    await queryRunner.query(`DROP INDEX "UQ_users_firebase_uid"`);
    await queryRunner.query(`DELETE FROM "users" WHERE "profile_complete" = false`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "app_profile" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "app_profile" SET DEFAULT 'CLIENT'`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "cpf" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_active"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profile_complete"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "firebase_uid"`);
  }
}
