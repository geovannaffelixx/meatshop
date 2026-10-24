import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitGallery1792800000000 implements MigrationInterface {
  name = 'AddUnitGallery1792800000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "units" ADD COLUMN "gallery_urls" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "units" DROP COLUMN "gallery_urls"');
  }
}
