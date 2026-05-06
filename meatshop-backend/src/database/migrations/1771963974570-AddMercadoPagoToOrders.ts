import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMercadoPagoToOrders1771963974570 implements MigrationInterface {
    name = 'AddMercadoPagoToOrders1771963974570'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "mp_preference_id" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "mp_payment_id" character varying(40)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "mp_status" character varying(30)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "mp_status_detail" character varying(60)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "mp_last_event_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "mp_paid_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "mp_paid_at"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "mp_last_event_at"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "mp_status_detail"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "mp_status"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "mp_payment_id"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "mp_preference_id"`);
    }

}
