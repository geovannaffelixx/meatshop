import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliveryVerificationCodes1788010000000 implements MigrationInterface {
  name = 'AddDeliveryVerificationCodes1788010000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders ADD pickup_code_hash character varying(64)`);
    await queryRunner.query(`ALTER TABLE orders ADD delivery_code_hash character varying(64)`);
    await queryRunner.query(`ALTER TABLE orders ADD pickup_code_expires_at TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE orders ADD delivery_code_expires_at TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE orders ADD pickup_code_attempts integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE orders ADD delivery_code_attempts integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE orders ADD pickup_code_locked_until TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE orders ADD delivery_code_locked_until TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE orders ADD pickup_verified_at TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE orders ADD delivery_verified_at TIMESTAMP`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN delivery_verified_at`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN pickup_verified_at`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN delivery_code_locked_until`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN pickup_code_locked_until`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN delivery_code_attempts`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN pickup_code_attempts`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN delivery_code_expires_at`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN pickup_code_expires_at`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN delivery_code_hash`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN pickup_code_hash`);
  }
}
