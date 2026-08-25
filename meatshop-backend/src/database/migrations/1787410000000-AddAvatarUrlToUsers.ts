import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarUrlToUsers1787410000000 implements MigrationInterface {
  name = 'AddAvatarUrlToUsers1787410000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "avatar_url" varchar NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url"`);
  }
}
