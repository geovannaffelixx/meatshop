// Run inside the development backend container after preparing Firebase identities.
// Creates only this named acceptance dataset. Existing rows are preserved on reruns.
const fs = require('node:fs');
const bcrypt = require('/usr/src/app/node_modules/bcrypt');
const ds = require('/usr/src/app/dist/database/data-source.js').default;

function documentNumber(base, weights) {
  let digits = base;
  for (const factors of weights) {
    const remainder = [...digits].reduce((sum, value, i) => sum + Number(value) * factors[i], 0) % 11;
    digits += remainder < 2 ? '0' : String(11 - remainder);
  }
  return digits;
}

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.DB_HOST !== 'db' || process.env.DB_DATABASE !== 'meatshop') {
    throw new Error('This dataset is restricted to the local development Compose database');
  }
  if (!process.env.TEST_DATA_PASSWORD) throw new Error('TEST_DATA_PASSWORD is required');
  const identities = JSON.parse(fs.readFileSync('/tmp/anapolis-identities.json', 'utf8'));
  const hash = await bcrypt.hash(process.env.TEST_DATA_PASSWORD, 12);
  ds.setOptions({ logging: false, entities: ['/usr/src/app/dist/**/*.entity.js'] });
  ds.logger = new (require('/usr/src/app/node_modules/typeorm').SimpleConsoleLogger)(false);
  await ds.initialize();
  const summary = await ds.transaction(async manager => {
    async function ensure(entity, where, values) {
      const repository = manager.getRepository(entity);
      return await repository.findOneBy(where) ?? await repository.save(repository.create({ ...where, ...values }));
    }
    const users = {};
    const addresses = {};
    for (const [index, identity] of identities.entries()) {
      const profile = identity.key === 'entregador' ? 'DELIVERY' : ['gestor', 'lojaa', 'lojab'].includes(identity.key) ? 'BOTH' : 'CLIENT';
      users[identity.key] = await ensure('User', { email: identity.email }, {
        name: identity.name, password_hash: hash, firebase_uid: identity.uid,
        cpf: documentNumber(String(330000100 + index), [[10,9,8,7,6,5,4,3,2], [11,10,9,8,7,6,5,4,3,2]]),
        phone: `6299000330${index}`, global_role: 'USER', app_profile: profile,
        profile_complete: true, email_verified: true, is_active: true,
      });
      const user = users[identity.key];
      if (user.firebase_uid !== identity.uid || !await bcrypt.compare(process.env.TEST_DATA_PASSWORD, user.password_hash)) {
        throw new Error(`Existing dataset user has different credentials: ${identity.email}`);
      }
      addresses[identity.key] = await ensure('Address', { user_id: user.id, complement: 'Massa de testes 3.3.0 - endereco ficticio' }, {
        street: 'Rua de Testes', number: String(100 + index), neighborhood: 'Centro',
        city: 'Anápolis', state: 'GO', zip_code: '75020010', label: 'Casa', is_default: true,
        latitude: -16.3285 - index * 0.0001, longitude: -48.9534,
        coordinate_source: 'USER_PIN',
      });
      await ensure('NotificationPreference', { user_id: user.id }, {
        orders_enabled: true, delivery_enabled: true,
        promotions_enabled: identity.key !== 'clienteb', system_enabled: true,
      });
    }
    const units = [];
    const products = [];
    for (const [index, key] of ['lojaa', 'lojab'].entries()) {
      const letter = index === 0 ? 'A' : 'B';
      const cnpj = documentNumber(`33033000000${index + 1}`, [[5,4,3,2,9,8,7,6,5,4,3,2], [6,5,4,3,2,9,8,7,6,5,4,3,2]]);
      const unit = await ensure('Unit', { cnpj }, {
        name: `Teste 3.3.0 - Loja ${letter} Anápolis`, admin_id: users[key].id,
        street: `Rua de Testes ${letter}`, number: index === 0 ? '200' : '300',
        complement: 'Estabelecimento ficticio para testes', neighborhood: 'Centro',
        city: 'Anápolis', state: 'GO', zip_code: '75020010',
        latitude: -16.3281 + index * 0.001, longitude: -48.9530 + index * 0.001,
        coordinate_source: 'USER_PIN', delivery_radius_km: 25,
        scheduling_slot_minutes: index === 0 ? 30 : 60, scheduling_capacity: 1,
      });
      units.push(unit);
      await ensure('UserUnit', { user_id: users[key].id, unit_id: unit.id }, { local_role: 'OWNER', status: 'ACTIVE' });
      await ensure('UserUnit', { user_id: users.gestor.id, unit_id: unit.id }, { local_role: 'MANAGER', status: 'ACTIVE' });
      for (const weekday of ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']) {
        await ensure('BusinessHours', { unit_id: unit.id, weekday }, {
          is_open: true, opening_time: index === 0 ? '08:00:00' : '10:00:00',
          closing_time: index === 0 ? '18:00:00' : '16:00:00',
        });
      }
      const beef = await ensure('Category', { unit_id: unit.id, name: 'Bovinos' }, { active: true, description: 'Categoria de testes 3.3.0' });
      const poultry = await ensure('Category', { unit_id: unit.id, name: 'Aves' }, { active: true, description: 'Categoria de testes 3.3.0' });
      const definitions = [
        ['Picanha teste A', beef.id, 'Swift', 80, 30, true],
        ['Picanha teste B', beef.id, 'Friboi', 60, 30, true],
        ['Frango teste', poultry.id, 'Seara', 20, 30, true],
        ['Produto sem estoque', beef.id, 'Swift', 40, 0, true],
        ['Produto inativo teste', beef.id, 'Friboi', 35, 10, false],
        ['Kit financeiro teste', beef.id, 'Meatshop Teste', 100, 30, true],
      ];
      const unitProducts = [];
      for (const [name, category_id, brand, price, quantity, active] of definitions) {
        const product = await ensure('Product', { unit_id: unit.id, name }, {
          category_id, brand, price, active, unit_of_measure: 'kg',
          description: 'Produto ficticio da massa de testes 3.3.0',
        });
        await ensure('Stock', { product_id: product.id }, { quantity, min_quantity: 2 });
        unitProducts.push(product);
      }
      products.push(unitProducts);
      for (const [suffix, active, starts, ends] of [['10',true,-1,30], ['EXP',true,-30,-1], ['OFF',false,-1,30], ['FUT',true,3,30]]) {
        await ensure('Coupon', { code: `ANA${letter}${suffix}` }, {
          name: `Teste ${letter} ${suffix}`, description: 'Cupom de testes 3.3.0', type: 'UNIT', unit_id: unit.id,
          discount_type: 'PERCENTAGE', discount_amount: 10, minimum_order_value: 50,
          maximum_discount: 25, starts_at: new Date(Date.now() + starts * 86400000),
          expires_at: new Date(Date.now() + ends * 86400000), total_usage_limit: 100,
          usage_limit_per_user: 10, current_usage_count: 0, active, created_by: users[key].id,
        });
      }
      await ensure('Promotion', { unit_id: unit.id, title: `Promocao teste Loja ${letter} - ativar no painel` }, {
        product_id: unitProducts[2].id, created_by: users[key].id, description: 'Oferta de teste: ative para disparar notificacoes',
        discount_percentage: 10, active: false, starts_at: new Date(Date.now() - 86400000),
        ends_at: new Date(Date.now() + 30 * 86400000),
      });
    }
    const courier = await ensure('DeliveryPerson', { user_id: users.entregador.id }, {
      vehicle: 'MOTORCYCLE', status: 'ACTIVE', affiliation_type: 'AUTONOMOUS', is_online: false,
    });
    await ensure('Vehicle', { delivery_person_id: courier.id, plate: 'TST3A30' }, {
      type: 'MOTORCYCLE', model: 'Moto teste 3.3.0', color: 'Vermelha', year: 2026,
      is_active: true, is_enabled: true, photo_urls: [],
    });
    const orders = [];
    const samples = [
      ['clientea', 0, 0, 'DELIVERED', 'PAID', 0],
      ['clienteb', 0, 1, 'DELIVERED', 'PAID', 0],
      ['clientea', 0, 5, 'DELIVERED', 'PARTIALLY_REFUNDED', 20],
      ['clienteb', 1, 2, 'PENDING', 'PENDING', 0],
    ];
    for (const [index, [key, unitIndex, productIndex, status, paymentStatus, refunded]] of samples.entries()) {
      const product = products[unitIndex][productIndex];
      const checkout_id = `33033000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
      const address = addresses[key];
      const order = await ensure('Order', { checkout_id }, {
        client_id: users[key].id, unit_id: units[unitIndex].id,
        status, payment_status: paymentStatus, subtotal: product.price, total_amount: product.price,
        discount_amount: 0, delivery_fee: 0, delivery_type: 'DELIVERY', address_id: address.id,
        destination_snapshot: { street: address.street, number: address.number, neighborhood: address.neighborhood,
          city: address.city, state: address.state, zip_code: address.zip_code, latitude: address.latitude,
          longitude: address.longitude, coordinate_source: 'USER_PIN' },
        is_scheduled: false, delivery_status: status === 'DELIVERED' ? 'DELIVERED' : 'WAITING_DELIVERY_PERSON',
        delivery_person_id: status === 'DELIVERED' ? courier.id : null,
        delivery_verified_at: status === 'DELIVERED' ? new Date() : null,
      });
      await ensure('OrderItem', { order_id: order.id, product_id: product.id }, {
        quantity: 1, unit_price: product.price,
        product_snapshot: { name: product.name, unit_of_measure: product.unit_of_measure, image_url: null },
      });
      await ensure('Payment', { order_id: order.id }, {
        method: 'Cash', status: paymentStatus, refunded_amount: refunded,
        fee_amount: refunded ? 5 : 0, payment_date: paymentStatus === 'PENDING' ? null : new Date(),
        received_by: paymentStatus === 'PENDING' ? null : users.gestor.id,
        receipt_reference: `MASSA-TESTE-330-${index + 1}`,
      });
      orders.push({ id: order.id, client: key, unit: units[unitIndex].name, status, paymentStatus, total: product.price });
    }
    return {
      users: Object.entries(users).map(([key, user]) => ({ key, id: user.id, email: user.email })),
      units: units.map(unit => ({ id: unit.id, name: unit.name })),
      products: products.flat().map(product => ({ id: product.id, unit_id: product.unit_id, name: product.name, price: product.price })),
      orders,
    };
  });
  console.log(JSON.stringify(summary, null, 2));
  await ds.destroy();
}
main().catch(async error => { console.error(error.message); if (ds.isInitialized) await ds.destroy(); process.exitCode = 1; });
