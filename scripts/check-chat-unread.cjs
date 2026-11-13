// Local PostgreSQL regression: all messages are temporary and the transaction is rolled back.
// Get-Content scripts/check-chat-unread.cjs -Raw | docker compose exec -T backend node
const assert = require('node:assert/strict');
const source = require('/usr/src/app/dist/database/data-source').default;
const { Order } = require('/usr/src/app/dist/orders/entities/order.entity');
const { Chat } = require('/usr/src/app/dist/chat/entities/chat.entity');
const { ListOrderHistoryUseCase } = require('/usr/src/app/dist/orders/use-cases/list-order-history.use-case');
const { MarkChatReadUseCase } = require('/usr/src/app/dist/chat/use-cases/mark-chat-read.use-case');
const { ChatInboxService } = require('/usr/src/app/dist/chat/services/chat-inbox.service');
const { Unit } = require('/usr/src/app/dist/units/entities/unit.entity');
const { UserUnit } = require('/usr/src/app/dist/units/entities/user-unit.entity');
const { DeliveryPerson } = require('/usr/src/app/dist/delivery/entities/delivery-person.entity');

async function main() {
  source.setOptions({ logging: false }); source.logger = new (require('typeorm').SimpleConsoleLogger)(false);
  await source.initialize(); const runner = source.createQueryRunner();
  await runner.connect(); await runner.startTransaction();
  try {
    const [order] = await runner.query('SELECT o.id,o.unit_id,o.client_id,u.admin_id,d.user_id AS courier_id FROM orders o JOIN units u ON u.id=o.unit_id JOIN delivery_persons d ON d.id=o.delivery_person_id WHERE o.client_id<>u.admin_id AND d.user_id<>u.admin_id AND d.user_id<>o.client_id ORDER BY o.id LIMIT 1');
    assert.ok(order, 'A local order with a customer, unit and courier is required');
    await runner.query('CREATE TEMP TABLE chat_messages (LIKE public.chat_messages INCLUDING DEFAULTS) ON COMMIT DROP');
    const insert = async (id, sender, receiver, channel) => runner.query('INSERT INTO chat_messages (id,order_id,sender_id,receiver_id,participant_type,message,sent_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())', [id,order.id,sender,receiver,channel,'regression']);
    await insert(-93001,order.client_id,order.admin_id,'UNIT');
    await insert(-93002,order.client_id,order.admin_id,'UNIT');
    await insert(-93003,order.courier_id,order.admin_id,'UNIT_DELIVERY_PERSON');
    await insert(-93004,order.admin_id,order.client_id,'UNIT');
    await insert(-93005,order.client_id,order.courier_id,'DELIVERY_PERSON');
    const manager = runner.manager;
    const list = new ListOrderHistoryUseCase(manager.getRepository(Order), {}, {});
    const filters = {page:1,limit:10,sort:'chat_activity',search:String(order.id),unit_id:order.unit_id};
    const actor = {id:order.admin_id,global_role:'SUPER_ADMIN'};
    const counts = async () => (await list.panel(actor,filters)).data.find(row => row.id===order.id).chat_unread;
    assert.deepEqual(await counts(),{client:2,delivery:1});
    const read = new MarkChatReadUseCase(manager.getRepository(Chat),manager.getRepository(Order),{
      assertCanParticipate: async (_order,type,user) => ({senderId:user.id,receiverId:type==='UNIT'?order.client_id:type==='UNIT_DELIVERY_PERSON'?order.courier_id:order.client_id}),
    });
    await read.execute(order.id,'UNIT',actor);
    assert.deepEqual(await counts(),{client:0,delivery:1});
    const unread = await manager.getRepository(Chat).find({where:{order_id:order.id}});
    assert.equal(unread.find(row=>row.id===-93004).read_at,null,'Opening customer channel must not mark the unit response as read by the customer');
    assert.equal(unread.find(row=>row.id===-93005).read_at,null,'Private channel remains unread');
    const inbox = new ChatInboxService(manager.getRepository(Chat),manager.getRepository(Order),manager.getRepository(Unit),manager.getRepository(UserUnit),manager.getRepository(DeliveryPerson));
    const courier = await inbox.list({id:order.courier_id},{profile:'DELIVERY'});
    assert.equal(courier.items.find(row=>row.id===order.id+':DELIVERY_PERSON').unread_count,1);
    await read.execute(order.id,'UNIT_DELIVERY_PERSON',actor);
    assert.deepEqual(await counts(),{client:0,delivery:0});
    console.log('PASS: individual customer/courier unread counts, channel-specific reads, mobile inbox and private channel isolation. Rolled back.');
  } finally {
    await runner.rollbackTransaction(); await runner.release(); await source.destroy();
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
