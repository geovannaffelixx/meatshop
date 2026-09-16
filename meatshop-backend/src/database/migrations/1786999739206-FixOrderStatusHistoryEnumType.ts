import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixOrderStatusHistoryEnumType1786999739206 implements MigrationInterface {
  name = 'FixOrderStatusHistoryEnumType1786999739206';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "order_status_history_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')`,
    );
    await queryRunner.query(`
            ALTER TABLE "order_status_history" ALTER COLUMN "status" TYPE "order_status_history_status_enum"
            USING "status"::text::"order_status_history_status_enum"
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "order_status_history" ALTER COLUMN "status" TYPE "orders_status_enum"
            USING "status"::text::"orders_status_enum"
        `);
    await queryRunner.query(`DROP TYPE "order_status_history_status_enum"`);
  }
}
