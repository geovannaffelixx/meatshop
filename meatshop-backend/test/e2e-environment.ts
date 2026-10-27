// The smoke tests must never accidentally connect to a developer's application DB.
if (
  ['meatshop_gaps_test_330', 'meatshop_spec_test_330'].includes(process.env.E2E_TEST_DATABASE ?? '')
) {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DB_TYPE: 'postgres',
    DB_HOST: '127.0.0.1',
    DB_PORT: process.env.E2E_DB_PORT ?? '5433',
    DB_USERNAME: process.env.DB_USERNAME ?? 'meatshop_user',
    DB_PASSWORD: process.env.DB_PASSWORD ?? 'meatshop_pass',
    DB_DATABASE: process.env.E2E_TEST_DATABASE,
    DELIVERY_TEST_DATABASE: 'meatshop_gaps_test_330',
    DB_SSL: 'false',
    DB_SYNCHRONIZE: 'false',
    SEED_ENABLED: 'false',
    JWT_SECRET: 'isolated-gaps-access-secret-for-testing-only',
    JWT_REFRESH_SECRET: 'isolated-gaps-refresh-secret-for-testing-only',
    DELIVERY_CODE_SECRET: 'isolated-gaps-delivery-secret-for-testing-only',
    DELIVERY_CODE_ENCRYPTION_KEY: 'isolated-gaps-encryption-secret-for-testing-only',
    FRONTEND_URL: 'http://localhost:3000',
    CORS_ORIGINS: 'http://localhost:3000',
    PAYMENTS_ENABLED: 'false',
    FIREBASE_SERVICE_ACCOUNT: '',
    FIREBASE_PROJECT_ID: '',
    TYPEORM_LOGGING: 'false',
  });
}
