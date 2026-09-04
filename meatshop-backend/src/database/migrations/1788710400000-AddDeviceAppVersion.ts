import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceAppVersion1788710400000 implements MigrationInterface {
  name = 'AddDeviceAppVersion1788710400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_device_tokens" ADD "app_version" character varying(30)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_device_tokens" DROP COLUMN "app_version"`);
  }
}
