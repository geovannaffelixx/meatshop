import { CompleteFunctionalGaps1792790400000 } from '../src/database/migrations/1792790400000-CompleteFunctionalGaps';
import type { DataSource } from 'typeorm';
import { NotificationPreferences1792288801000 } from '../src/database/migrations/1792288801000-NotificationPreferences';
import { UnitSchedulingCapacity1792288802000 } from '../src/database/migrations/1792288802000-UnitSchedulingCapacity';
import { FunctionalGapsHardening1792288803000 } from '../src/database/migrations/1792288803000-FunctionalGapsHardening';
import { HardenPayments1790550000000 } from '../src/database/migrations/1790550000000-HardenPayments';
import { PaymentReceipts1790550001000 } from '../src/database/migrations/1790550001000-PaymentReceipts';
import { PaymentOperations1791900000000 } from '../src/database/migrations/1791900000000-PaymentOperations';
import { PaymentContract1791900002000 } from '../src/database/migrations/1791900002000-PaymentContract';

export async function applyFunctionalGapsMigrations(db: DataSource): Promise<void> {
  if (!['meatshop_geo_test', 'meatshop_payments_test'].includes(String(db.options.database))) {
    throw new Error('Only isolated integration databases may be prepared here');
  }
  const runner = db.createQueryRunner();
  try {
    await runner.startTransaction();
    if (!(await runner.hasColumn('orders', 'payment_due_at'))) {
      await new HardenPayments1790550000000().up(runner);
    }
    if (!(await runner.hasTable('payment_manual_events'))) {
      await new PaymentReceipts1790550001000().up(runner);
    }
    if (!(await runner.hasColumn('payments', 'payment_reference'))) {
      await new PaymentOperations1791900000000().up(runner);
    }
    if (!(await runner.hasColumn('order_items', 'product_snapshot'))) {
      await new PaymentContract1791900002000().up(runner);
    }
    if (!(await runner.hasTable('notification_preferences'))) {
      await new NotificationPreferences1792288801000().up(runner);
    }
    if (!(await runner.hasColumn('units', 'scheduling_slot_minutes'))) {
      await new UnitSchedulingCapacity1792288802000().up(runner);
    }
    if (!(await runner.hasColumn('promotions', 'notification_sent_at'))) {
      await new FunctionalGapsHardening1792288803000().up(runner);
    }
    if (!(await runner.hasTable('auth_login_attempts'))) {
      await new CompleteFunctionalGaps1792790400000().up(runner);
    }
    await runner.commitTransaction();
  } catch (error) {
    await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }
}
