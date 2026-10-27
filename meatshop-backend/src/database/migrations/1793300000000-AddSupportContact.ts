import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportContact1793300000000 implements MigrationInterface {
  name = 'AddSupportContact1793300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE support_tickets ADD COLUMN contact text NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE support_tickets DROP COLUMN contact');
  }
}
