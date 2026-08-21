import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPaymentsStatusEnumType1786999643168
  implements MigrationInterface {
  name = 'FixPaymentsStatusEnumType1786999643168';

  async up(queryRunner: QueryRunner): Promise<void> {
    // "payments"."status" e "orders"."payment_status" compartilhavam o mesmo
    // tipo Postgres ("orders_payment_status_enum"), mas a convenção de nomes
    // do TypeORM espera um tipo próprio por coluna. Isso fazia o `synchronize`
    // tentar "corrigir" o tipo a cada boot e falhar (o tipo antigo continuava
    // em uso pela tabela "orders"). Aqui separamos definitivamente os tipos.
    await queryRunner.query(
      `CREATE TYPE "payments_status_enum" AS ENUM('PENDING', 'PAID', 'REJECTED', 'REFUNDED', 'CANCELLED')`,
    );
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`
            ALTER TABLE "payments" ALTER COLUMN "status" TYPE "payments_status_enum"
            USING "status"::text::"payments_status_enum"
        `);
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`
            ALTER TABLE "payments" ALTER COLUMN "status" TYPE "orders_payment_status_enum"
            USING "status"::text::"orders_payment_status_enum"
        `);
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(`DROP TYPE "payments_status_enum"`);
  }
}
