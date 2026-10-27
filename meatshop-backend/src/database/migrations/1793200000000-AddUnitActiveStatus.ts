import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitActiveStatus1793200000000 implements MigrationInterface {
  name = 'AddUnitActiveStatus1793200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "units" ADD COLUMN "is_active" boolean NOT NULL DEFAULT true',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "units" DROP COLUMN "is_active"');
  }
}
