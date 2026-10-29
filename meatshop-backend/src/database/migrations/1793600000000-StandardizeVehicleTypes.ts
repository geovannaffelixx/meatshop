import type { MigrationInterface, QueryRunner } from 'typeorm';

export class StandardizeVehicleTypes1793600000000 implements MigrationInterface {
  name = 'StandardizeVehicleTypes1793600000000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query('LOCK TABLE delivery_persons, vehicles IN ACCESS EXCLUSIVE MODE');
    const [legacy] = await runner.query(`
      SELECT EXISTS (
        SELECT 1 FROM delivery_persons WHERE vehicle::text NOT IN ('MOTORCYCLE', 'CAR', 'BIKE')
        UNION ALL
        SELECT 1 FROM vehicles WHERE type::text NOT IN ('MOTORCYCLE', 'CAR', 'BIKE')
      ) AS present
    `);
    if (legacy.present) {
      throw new Error(
        'Unsupported vehicle records exist. Review their actual vehicle types before migrating; no automatic conversion is allowed.',
      );
    }
    await runner.query(
      'ALTER TYPE delivery_persons_vehicle_enum RENAME TO delivery_persons_vehicle_enum_previous',
    );
    await runner.query(
      "CREATE TYPE delivery_persons_vehicle_enum AS ENUM ('MOTORCYCLE', 'CAR', 'BIKE')",
    );
    await runner.query(
      'ALTER TABLE delivery_persons ALTER COLUMN vehicle TYPE delivery_persons_vehicle_enum USING vehicle::text::delivery_persons_vehicle_enum',
    );
    await runner.query('DROP TYPE delivery_persons_vehicle_enum_previous');
    await runner.query('ALTER TYPE vehicles_type_enum RENAME TO vehicles_type_enum_previous');
    await runner.query("CREATE TYPE vehicles_type_enum AS ENUM ('MOTORCYCLE', 'CAR', 'BIKE')");
    await runner.query(
      'ALTER TABLE vehicles ALTER COLUMN type TYPE vehicles_type_enum USING type::text::vehicles_type_enum',
    );
    await runner.query('DROP TYPE vehicles_type_enum_previous');
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('LOCK TABLE delivery_persons, vehicles IN ACCESS EXCLUSIVE MODE');
    await runner.query(
      'ALTER TYPE delivery_persons_vehicle_enum RENAME TO delivery_persons_vehicle_enum_current',
    );
    await runner.query(
      "CREATE TYPE delivery_persons_vehicle_enum AS ENUM ('MOTORCYCLE', 'BIKE', 'CAR', 'ON_FOOT')",
    );
    await runner.query(
      'ALTER TABLE delivery_persons ALTER COLUMN vehicle TYPE delivery_persons_vehicle_enum USING vehicle::text::delivery_persons_vehicle_enum',
    );
    await runner.query('DROP TYPE delivery_persons_vehicle_enum_current');
    await runner.query('ALTER TYPE vehicles_type_enum RENAME TO vehicles_type_enum_current');
    await runner.query(
      "CREATE TYPE vehicles_type_enum AS ENUM ('MOTORCYCLE', 'BIKE', 'CAR', 'SCOOTER')",
    );
    await runner.query(
      'ALTER TABLE vehicles ALTER COLUMN type TYPE vehicles_type_enum USING type::text::vehicles_type_enum',
    );
    await runner.query('DROP TYPE vehicles_type_enum_current');
  }
}
