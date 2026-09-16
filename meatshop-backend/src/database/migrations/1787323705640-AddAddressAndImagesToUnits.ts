import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressAndImagesToUnits1787323705640 implements MigrationInterface {
  name = 'AddAddressAndImagesToUnits1787323705640';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "units" ADD "street" character varying(150)`);
    await queryRunner.query(`ALTER TABLE "units" ADD "number" character varying(20)`);
    await queryRunner.query(`ALTER TABLE "units" ADD "complement" character varying(100)`);
    await queryRunner.query(`ALTER TABLE "units" ADD "neighborhood" character varying(80)`);
    await queryRunner.query(`ALTER TABLE "units" ADD "latitude" numeric(10,7)`);
    await queryRunner.query(`ALTER TABLE "units" ADD "longitude" numeric(10,7)`);
    await queryRunner.query(`ALTER TABLE "units" ADD "image_url" character varying`);
    await queryRunner.query(`ALTER TABLE "units" ADD "cover_url" character varying`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "cover_url"`);
    await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "image_url"`);
    await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "longitude"`);
    await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "latitude"`);
    await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "neighborhood"`);
    await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "complement"`);
    await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "number"`);
    await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "street"`);
  }
}
