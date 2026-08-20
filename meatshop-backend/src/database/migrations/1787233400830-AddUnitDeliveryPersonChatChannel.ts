import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitDeliveryPersonChatChannel1787233400830 implements MigrationInterface {
  name = 'AddUnitDeliveryPersonChatChannel1787233400830';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TYPE "chat_messages_participant_type_enum" ADD VALUE 'UNIT_DELIVERY_PERSON'
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres cannot drop a single enum value directly; recreate the type without it.
    // Messages already using this channel are removed, since there is no equivalent value to fall back to.
    await queryRunner.query(
      `DELETE FROM "chat_messages" WHERE "participant_type" = 'UNIT_DELIVERY_PERSON'`,
    );
    await queryRunner.query(`
            CREATE TYPE "chat_messages_participant_type_enum_old" AS ENUM('UNIT', 'DELIVERY_PERSON')
        `);
    await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ALTER COLUMN "participant_type" TYPE "chat_messages_participant_type_enum_old"
            USING ("participant_type"::text::"chat_messages_participant_type_enum_old")
        `);
    await queryRunner.query(`DROP TYPE "chat_messages_participant_type_enum"`);
    await queryRunner.query(`
            ALTER TYPE "chat_messages_participant_type_enum_old" RENAME TO "chat_messages_participant_type_enum"
        `);
  }
}
