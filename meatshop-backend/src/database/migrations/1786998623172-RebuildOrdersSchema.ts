import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RebuildOrdersSchema1786998623172 implements MigrationInterface {
  name = 'RebuildOrdersSchema1786998623172';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "orders" CASCADE`);

    await queryRunner.query(
      `CREATE TYPE "orders_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "orders_delivery_status_enum" AS ENUM('WAITING_DELIVERY_PERSON', 'PICKUP', 'ON_THE_WAY', 'DELIVERED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "orders_delivery_step_enum" AS ENUM('PICKUP', 'DELIVERING')`,
    );
    await queryRunner.query(
      `CREATE TYPE "orders_delivery_type_enum" AS ENUM('DELIVERY', 'PICKUP')`,
    );
    await queryRunner.query(
      `CREATE TYPE "orders_cancelled_by_enum" AS ENUM('CLIENT', 'UNIT', 'SYSTEM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "orders_payment_status_enum" AS ENUM('PENDING', 'PAID', 'REJECTED', 'REFUNDED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "payments_method_enum" AS ENUM('Pix', 'Crédito', 'Débito', 'Dinheiro', 'Boleto', 'Saldo MP')`,
    );

    await queryRunner.query(`
            CREATE TABLE "orders" (
                "id" SERIAL NOT NULL,
                "client_id" integer NOT NULL,
                "unit_id" integer NOT NULL,
                "delivery_person_id" integer,
                "order_date" TIMESTAMP NOT NULL DEFAULT now(),
                "status" "orders_status_enum" NOT NULL DEFAULT 'PENDING',
                "delivery_status" "orders_delivery_status_enum",
                "delivery_step" "orders_delivery_step_enum",
                "total_amount" numeric(10,2) NOT NULL,
                "subtotal" numeric(10,2) NOT NULL,
                "discount_amount" numeric(10,2) NOT NULL DEFAULT 0,
                "delivery_fee" numeric(10,2) NOT NULL DEFAULT 0,
                "cancellation_reason" text,
                "cancelled_at" TIMESTAMP,
                "cancelled_by" "orders_cancelled_by_enum",
                "address_id" integer,
                "coupon_id" integer,
                "scheduled_delivery_date" TIMESTAMP,
                "is_scheduled" boolean NOT NULL DEFAULT false,
                "delivery_type" "orders_delivery_type_enum" NOT NULL DEFAULT 'DELIVERY',
                "payment_status" "orders_payment_status_enum" NOT NULL DEFAULT 'PENDING',
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_orders" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "orders"
            ADD CONSTRAINT "FK_orders_client_id" FOREIGN KEY ("client_id")
            REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "orders"
            ADD CONSTRAINT "FK_orders_unit_id" FOREIGN KEY ("unit_id")
            REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "orders"
            ADD CONSTRAINT "FK_orders_delivery_person_id" FOREIGN KEY ("delivery_person_id")
            REFERENCES "delivery_persons"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "orders"
            ADD CONSTRAINT "FK_orders_address_id" FOREIGN KEY ("address_id")
            REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "orders"
            ADD CONSTRAINT "FK_orders_coupon_id" FOREIGN KEY ("coupon_id")
            REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            CREATE TABLE "order_items" (
                "id" SERIAL NOT NULL,
                "order_id" integer NOT NULL,
                "product_id" integer NOT NULL,
                "quantity" integer NOT NULL,
                "unit_price" numeric(10,2) NOT NULL,
                CONSTRAINT "PK_order_items" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "order_items"
            ADD CONSTRAINT "FK_order_items_order_id" FOREIGN KEY ("order_id")
            REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "order_items"
            ADD CONSTRAINT "FK_order_items_product_id" FOREIGN KEY ("product_id")
            REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            CREATE TABLE "payments" (
                "id" SERIAL NOT NULL,
                "order_id" integer NOT NULL,
                "method" "payments_method_enum",
                "status" "orders_payment_status_enum" NOT NULL DEFAULT 'PENDING',
                "payment_date" TIMESTAMP,
                "transaction_id" character varying(40),
                "mp_preference_id" character varying(120),
                "mp_status_detail" character varying(60),
                "mp_last_event_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_payments_order_id" UNIQUE ("order_id"),
                CONSTRAINT "PK_payments" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "payments"
            ADD CONSTRAINT "FK_payments_order_id" FOREIGN KEY ("order_id")
            REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            CREATE TABLE "order_status_history" (
                "id" SERIAL NOT NULL,
                "order_id" integer NOT NULL,
                "updated_by" integer,
                "status" "orders_status_enum" NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_order_status_history" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "order_status_history"
            ADD CONSTRAINT "FK_order_status_history_order_id" FOREIGN KEY ("order_id")
            REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "order_status_history"
            ADD CONSTRAINT "FK_order_status_history_updated_by" FOREIGN KEY ("updated_by")
            REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_status_history" DROP CONSTRAINT "FK_order_status_history_updated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" DROP CONSTRAINT "FK_order_status_history_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "order_status_history"`);

    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_order_id"`);
    await queryRunner.query(`DROP TABLE "payments"`);

    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_product_id"`,
    );
    await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_order_id"`);
    await queryRunner.query(`DROP TABLE "order_items"`);

    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_coupon_id"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_address_id"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_delivery_person_id"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_unit_id"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_client_id"`);
    await queryRunner.query(`DROP TABLE "orders"`);

    await queryRunner.query(`DROP TYPE "payments_method_enum"`);
    await queryRunner.query(`DROP TYPE "orders_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "orders_cancelled_by_enum"`);
    await queryRunner.query(`DROP TYPE "orders_delivery_type_enum"`);
    await queryRunner.query(`DROP TYPE "orders_delivery_step_enum"`);
    await queryRunner.query(`DROP TYPE "orders_delivery_status_enum"`);
    await queryRunner.query(`DROP TYPE "orders_status_enum"`);
  }
}
