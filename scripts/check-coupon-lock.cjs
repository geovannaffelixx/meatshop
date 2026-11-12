// Run against the local backend without changing persistent data:
// Get-Content scripts/check-coupon-lock.cjs -Raw | docker compose exec -T backend node
const assert = require('node:assert/strict');
const source = require('/usr/src/app/dist/database/data-source').default;
const { CouponRedemptionService } = require('/usr/src/app/dist/promotions/services/coupon-redemption.service');
const { CouponPolicyService } = require('/usr/src/app/dist/promotions/services/coupon-policy.service');

async function main() {
  source.setOptions({ logging: false });
  source.logger = new (require('typeorm').SimpleConsoleLogger)(false);
  await source.initialize();
  const runner = source.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    // Temporary tables shadow the real tables only on this connection.
    await runner.query('CREATE TEMP TABLE coupons (LIKE public.coupons INCLUDING DEFAULTS) ON COMMIT DROP');
    await runner.query('CREATE TEMP TABLE coupon_units (LIKE public.coupon_units INCLUDING DEFAULTS) ON COMMIT DROP');
    const service = new CouponRedemptionService(new CouponPolicyService());
    const context = { userId: 1, unitId: 1, subtotal: 100 };
    await assert.rejects(service.prepare('__MISSING__', context, runner.manager),
      (error) => error.getResponse?.().code === 'COUPON_NOT_FOUND');
    await runner.query(`INSERT INTO coupons
      (id,code,name,type,discount_type,discount_amount,minimum_order_value,starts_at,expires_at,created_by)
      VALUES (-91001,'__LOCK_CHECK__','Lock check','PLATFORM','FIXED',5,0,NOW()-INTERVAL '1 day',NOW()+INTERVAL '1 day',1)`);
    assert.equal((await service.prepare('__lock_check__', context, runner.manager)).discountAmount, 5);
    await runner.query('INSERT INTO coupon_units(coupon_id,unit_id) VALUES (-91001,2)');
    await assert.rejects(service.prepare('__LOCK_CHECK__', context, runner.manager),
      (error) => error.getResponse?.().code === 'COUPON_NOT_APPLICABLE');
    assert.equal((await service.prepare('__LOCK_CHECK__', { ...context, unitId: 2 }, runner.manager)).discountAmount, 5);
    console.log('PASS: missing coupon, coupon without allowed units, and scoped coupon on PostgreSQL.');
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
    await source.destroy();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
