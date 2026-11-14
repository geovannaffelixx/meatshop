// PostgreSQL regression: temporary messages and rollback preserve all application data.
// Get-Content scripts/check-chat-activity.cjs -Raw | docker compose exec -T backend node
const assert = require('node:assert/strict');
const source = require('/usr/src/app/dist/database/data-source').default;
const { Order } = require('/usr/src/app/dist/orders/entities/order.entity');
const { ListOrderHistoryUseCase } = require('/usr/src/app/dist/orders/use-cases/list-order-history.use-case');

async function main() {
  source.setOptions({ logging: false });
  source.logger = new (require('typeorm').SimpleConsoleLogger)(false);
  await source.initialize();
  const runner = source.createQueryRunner();
  await runner.connect(); await runner.startTransaction();
  try {
    await runner.query('CREATE TEMP TABLE chat_messages (LIKE public.chat_messages INCLUDING DEFAULTS) ON COMMIT DROP');
    const service = new ListOrderHistoryUseCase(runner.manager.getRepository(Order), {}, {});
    const user = { id: 1, global_role: 'SUPER_ADMIN' };
    const filters = { page: 1, limit: 1, sort: 'chat_activity' };
    const recent = await service.panel(user, filters);
    const oldest = await runner.query('SELECT id FROM orders WHERE id <> $1 ORDER BY order_date ASC, id ASC LIMIT 1', [recent.data[0].id]);
    assert.ok(oldest.length, 'Two orders are required in the local database');
    const oldId = oldest[0].id;
    // Private client/courier messages must not affect the unit inbox.
    await runner.query("INSERT INTO chat_messages (id,order_id,sender_id,receiver_id,participant_type,message,sent_at) VALUES (-91001,$1,1,1,'DELIVERY_PERSON','test',NOW())", [oldId]);
    assert.equal((await service.panel(user, filters)).data[0].id, recent.data[0].id);
    await runner.query("INSERT INTO chat_messages (id,order_id,sender_id,receiver_id,participant_type,message,sent_at) VALUES (-91002,$1,1,1,'UNIT','test',NOW())", [oldId]);
    const after = await service.panel(user, filters);
    assert.equal(after.data[0].id, oldId, 'Old order with a new message must move to the first page');
    assert.ok(after.data[0].chat_last_message_at);
    const page2 = await service.panel(user, { ...filters, page: 2 });
    assert.notEqual(page2.data[0].id, oldId);
    const ordinary = await service.panel(user, { page: 1, limit: 1 });
    assert.equal(ordinary.data[0].id, recent.data[0].id, 'The ordinary order listing keeps its existing sort');
    console.log('PASS: newest message moves an old order to page 1, private channels excluded, order listing unchanged. Rolled back.');
  } finally {
    await runner.rollbackTransaction(); await runner.release(); await source.destroy();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
