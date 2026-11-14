// Get-Content scripts/check-counter-pickup.cjs -Raw | docker compose exec -T backend node
// All fixtures use temporary tables and are rolled back; real orders are untouched.
const assert = require('node:assert/strict');
const source = require('/usr/src/app/dist/database/data-source').default;
const { Order } = require('/usr/src/app/dist/orders/entities/order.entity');
const { OrderStatusHistory } = require('/usr/src/app/dist/orders/entities/order-status-history.entity');
const { DeliveryCodeService } = require('/usr/src/app/dist/orders/services/delivery-code.service');
const { OrderStatusService } = require('/usr/src/app/dist/orders/services/order-status.service');

async function main() {
  source.setOptions({ logging: false });
  source.logger = new (require('typeorm').SimpleConsoleLogger)(false);
  await source.initialize();
  const runner = source.createQueryRunner();
  await runner.connect(); await runner.startTransaction();
  try {
    for (const table of ['orders', 'payments', 'order_status_history']) {
      await runner.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS) ON COMMIT DROP`);
    }
    await runner.query('CREATE TEMP SEQUENCE pickup_history_ids');
    await runner.query("ALTER TABLE order_status_history ALTER COLUMN id SET DEFAULT nextval('pickup_history_ids')");
    await runner.query('INSERT INTO orders SELECT * FROM public.orders ORDER BY id LIMIT 1');
    const [fixture] = await runner.query('SELECT id FROM orders');
    assert.ok(fixture, 'A local demo order is required for this check');
    await runner.query('INSERT INTO payments SELECT * FROM public.payments ORDER BY order_id LIMIT 1');
    await runner.query("UPDATE orders SET status='READY',delivery_type='PICKUP',delivery_person_id=NULL,delivery_status=NULL,delivery_step=NULL,payment_status='PENDING'");
    await runner.query("UPDATE payments SET order_id=$1,method='Cash',status='PENDING'", [fixture.id]);
    const repository = runner.manager.getRepository(Order);
    const codes = new DeliveryCodeService({ get: (key, fallback) => process.env[key] ?? fallback }, repository);
    const notifications = { notifyCustomerOfStatusChange: async () => undefined };
    const service = new OrderStatusService(repository, runner.manager.getRepository(OrderStatusHistory), notifications, codes);
    const get = () => repository.findOneByOrFail({ id: fixture.id });
    const fixtureOrder = await get();
    const code = codes.issue(fixtureOrder, 'DELIVERY');
    await repository.save(fixtureOrder);
    await assert.rejects(service.transition(await get(), 'DELIVERED', null, code),
      error => error.getResponse?.().code === 'PICKUP_PAYMENT_REQUIRED');
    await runner.query("UPDATE orders SET payment_status='PAID'");
    await runner.query("UPDATE payments SET status='PAID'");
    await assert.rejects(service.transition(await get(), 'DELIVERED', null, code === '000000' ? '000001' : '000000'),
      error => error.getResponse?.().code === 'INVALID_DELIVERY_CODE' && error.getStatus() === 400);
    assert.equal((await get()).delivery_code_attempts, 1);
    assert.equal((await get()).status, 'READY');

    // Force a real PostgreSQL failure after code verification and status save.
    await runner.query('ALTER TABLE order_status_history ADD CONSTRAINT pickup_save_failure CHECK (false)');
    await assert.rejects(service.transition(await get(), 'DELIVERED', null, code));
    assert.equal((await get()).status, 'READY');
    assert.equal((await get()).delivery_verified_at, null);
    await runner.query('ALTER TABLE order_status_history DROP CONSTRAINT pickup_save_failure');
    const completed = await service.transition(await get(), 'DELIVERED', null, code);
    assert.equal(completed.status, 'DELIVERED');
    assert.equal(completed.delivery_person_id, null);
    assert.ok(completed.delivery_verified_at);
    assert.equal((await runner.query('SELECT * FROM order_status_history')).length, 1);
    await assert.rejects(service.transition(await get(), 'DELIVERED', null, code));
    console.log('PASS: pending receipt, invalid code, persisted attempt, atomic rollback, successful counter pickup and replay protection on PostgreSQL.');

    await runner.query('DELETE FROM order_status_history');
    await runner.query("UPDATE orders SET status='READY',delivery_type='DELIVERY',delivery_person_id=21,delivery_status='PICKUP',delivery_step=NULL");
    for (const purpose of ['PICKUP', 'DELIVERY']) {
      const nextStatus = purpose === 'PICKUP' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
      const verifiedField = purpose === 'PICKUP' ? 'pickup_verified_at' : 'delivery_verified_at';
      const attemptField = purpose === 'PICKUP' ? 'pickup_code_attempts' : 'delivery_code_attempts';
      const current = await get();
      const handoffCode = codes.issue(current, purpose);
      await repository.save(current);
      const previousStatus = current.status;
      await assert.rejects(service.transition(await get(), nextStatus, null,
        handoffCode === '000000' ? '000001' : '000000'));
      assert.equal((await get())[attemptField], 1);
      await runner.query('ALTER TABLE order_status_history ADD CONSTRAINT handoff_save_failure CHECK (false) NOT VALID');
      await assert.rejects(service.transition(await get(), nextStatus, null, handoffCode));
      assert.equal((await get()).status, previousStatus);
      assert.equal((await get())[verifiedField], null);
      await runner.query('ALTER TABLE order_status_history DROP CONSTRAINT handoff_save_failure');
      const result = await service.transition(await get(), nextStatus, null, handoffCode);
      assert.equal(result.status, nextStatus);
      assert.ok(result[verifiedField]);
      if (purpose === 'PICKUP') assert.equal(result.delivery_status, 'ON_THE_WAY');
      else assert.equal(result.delivery_status, 'DELIVERED');
      await assert.rejects(service.transition(await get(), nextStatus, null, handoffCode));
    }
    console.log('PASS: both delivery handoffs retain their code after a PostgreSQL rollback, persist invalid attempts, and reject replay.');
  } finally {
    await runner.rollbackTransaction(); await runner.release(); await source.destroy();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
