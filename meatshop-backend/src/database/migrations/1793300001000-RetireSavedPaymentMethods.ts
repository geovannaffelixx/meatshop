import type { MigrationInterface, QueryRunner } from 'typeorm';
import { CreateSavedPaymentMethodsSchema1787063084784 } from './1787063084784-CreateSavedPaymentMethodsSchema';

export class RetireSavedPaymentMethods1793300001000 implements MigrationInterface {
  name = 'RetireSavedPaymentMethods1793300001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE saved_payment_methods');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await new CreateSavedPaymentMethodsSchema1787063084784().up(queryRunner);
  }
}
