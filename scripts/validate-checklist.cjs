const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { resolve } = require('node:path');
const { mkdirSync, writeFileSync } = require('node:fs');

const backend = resolve(__dirname, '../meatshop-backend');
const results = resolve(backend, 'test-results/checklist');
mkdirSync(results, { recursive: true });
const env = { ...process.env, NODE_ENV: 'test', DB_TYPE: 'postgres', DB_HOST: '127.0.0.1',
  DB_PORT: process.env.CHECKLIST_DB_PORT || '55432', DB_USERNAME: 'meatshop_validation', DB_PASSWORD: '',
  DB_SYNCHRONIZE: 'false', DB_SSL: 'false', FIREBASE_APP_CHECK_ENFORCED: 'false', SEED_ENABLED: 'false',
  DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'), DATA_HASH_KEY: randomBytes(32).toString('base64'),
  METRICS_TOKEN: randomBytes(32).toString('hex'), JWT_SECRET: randomBytes(32).toString('hex'),
  JWT_REFRESH_SECRET: randomBytes(32).toString('hex'), DELIVERY_CODE_SECRET: randomBytes(32).toString('hex'),
  DELIVERY_CODE_ENCRYPTION_KEY: randomBytes(32).toString('hex'), RATE_LIMIT_MAX: '100000',
  E2E_TEST_DATABASE: 'meatshop_gaps_test_330', GAPS_TEST_DATABASE: 'meatshop_gaps_test_330',
  E2E_DB_PORT: process.env.CHECKLIST_DB_PORT || '55432', PAYMENTS_TEST_DATABASE: 'meatshop_payments_test',
  PAYMENTS_TEST_PORT: process.env.CHECKLIST_DB_PORT || '55432', LEGAL_ACCEPTANCE_REQUIRED: 'false',
};
function run(name, entry, args, overrides = {}) {
  const result = spawnSync(process.execPath, [resolve(backend, entry), ...args], {
    cwd: backend, env: { ...env, ...overrides }, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024,
  });
  writeFileSync(resolve(results, `${name}.log`), `${result.stdout || ''}\n${result.stderr || ''}`);
  console.log(`${name}: ${result.status === 0 ? 'PASS' : 'FAIL'} (log: test-results/checklist/${name}.log)`);
  if (result.status !== 0) { console.log((result.stderr || result.stdout || '').slice(-2500)); process.exit(result.status || 1); }
}
async function validate() {
  const { Client } = require('../meatshop-backend/node_modules/pg');
  const admin = new Client({ host: '127.0.0.1', port: Number(env.DB_PORT), user: 'meatshop_validation', database: 'postgres' });
  await admin.connect();
  const identity = await admin.query('SELECT current_user AS username');
  if (identity.rows[0].username !== 'meatshop_validation' || env.DB_PORT !== '55432') throw new Error('Refusing nonisolated database reset');
  for (const name of ['meatshop_gaps_test_330','meatshop_payments_test','meatshop_checklist_migrations_test']) {
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${name}`);
  }
  await admin.end();
run('build', 'node_modules/@nestjs/cli/bin/nest.js', ['build']);
for (const database of ['meatshop_gaps_test_330','meatshop_payments_test','meatshop_checklist_migrations_test']) {
  run(`migrate-${database}`, 'node_modules/typeorm/cli.js', ['-d','dist/database/data-source.js','migration:run'], { DB_DATABASE: database });
}
const migrationDb = 'meatshop_checklist_migrations_test';
const { FieldEncryption } = require('../meatshop-backend/dist/common/security/field-encryption');
const cipher = FieldEncryption.fromEnvironment(env);
const inspect = new Client({ host: '127.0.0.1', port: Number(env.DB_PORT), user: 'meatshop_validation', database: migrationDb });
await inspect.connect();
await inspect.query('INSERT INTO users(email,cpf,phone,cpf_hash,phone_hash) VALUES ($1,$2,$3,$4,$5)',
  ['migration@example.test',cipher.encrypt('12345678909'),cipher.encrypt('11987654321'),
    cipher.blindIndex('cpf:12345678909'),cipher.blindIndex('phone:11987654321')]);
run('rollback-refresh-identity', 'node_modules/typeorm/cli.js', ['-d','dist/database/data-source.js','migration:revert'], { DB_DATABASE: migrationDb });
run('rollback-identity', 'node_modules/typeorm/cli.js', ['-d','dist/database/data-source.js','migration:revert'], { DB_DATABASE: migrationDb });
const plaintext = await inspect.query('SELECT cpf,phone FROM users WHERE email=$1', ['migration@example.test']);
if (plaintext.rows[0].cpf !== '12345678909' || plaintext.rows[0].phone !== '11987654321') throw new Error('Identity rollback did not restore plaintext');
for (let index=0;index<7;index++) run(`rollback-checklist-${index}`, 'node_modules/typeorm/cli.js',
  ['-d','dist/database/data-source.js','migration:revert'], { DB_DATABASE: migrationDb });
run('reapply-checklist', 'node_modules/typeorm/cli.js', ['-d','dist/database/data-source.js','migration:run'], { DB_DATABASE: migrationDb });
const encrypted = await inspect.query('SELECT cpf FROM users WHERE email=$1', ['migration@example.test']);
if (!encrypted.rows[0].cpf.startsWith('enc:v1:') || cipher.decrypt(encrypted.rows[0].cpf) !== '12345678909') throw new Error('Identity migration did not encrypt existing rows');
await inspect.end();
console.log('Migration rollback and existing identity encryption: PASS');
run('integration', 'node_modules/jest/bin/jest.js', ['--config','jest.e2e.config.cjs','--runInBand',
  'checklist.e2e','functional-gaps','app.e2e','health.e2e','metrics.e2e','specification','payments.e2e-spec'], { DB_DATABASE: 'meatshop_gaps_test_330' });

}
validate().catch((error) => { console.error(error.message); process.exitCode = 1; });
