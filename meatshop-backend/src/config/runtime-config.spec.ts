import { getAllowedOrigins, readPositiveInteger, validateEnvironment } from './runtime-config';

describe('runtime config', () => {
  it('normalizes and deduplicates configured origins', () => {
    expect(
      getAllowedOrigins({ CORS_ORIGINS: 'https://app.example.com/, https://app.example.com' }),
    ).toEqual(['https://app.example.com']);
  });

  it('rejects invalid positive integers', () => {
    expect(() => readPositiveInteger({ RATE_LIMIT_MAX: '0' }, 'RATE_LIMIT_MAX', 120)).toThrow();
  });

  it('rejects insecure production configuration', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DB_TYPE: 'postgres',
        DB_SYNCHRONIZE: 'false',
        CORS_ORIGINS: 'http://app.example.com',
        COOKIE_SECURE: 'false',
        JWT_SECRET: 'x'.repeat(32),
        JWT_REFRESH_SECRET: 'x'.repeat(32),
        DELIVERY_CODE_SECRET: 'x'.repeat(32),
        DELIVERY_CODE_ENCRYPTION_KEY: 'x'.repeat(32),
      }),
    ).toThrow();
  });

  it('accepts a complete production configuration', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DB_TYPE: 'postgres',
        DB_HOST: 'database.internal',
        DB_USERNAME: 'meatshop',
        DB_PASSWORD: 'database-secret',
        DB_DATABASE: 'meatshop',
        DB_SYNCHRONIZE: 'false',
        DB_SSL: 'true',
        CORS_ORIGINS: 'https://app.example.com',
        BACKEND_PUBLIC_URL: 'https://api.example.com',
        COOKIE_SECURE: 'true',
        FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
          project_id: 'example',
          client_email: 'firebase@example.com',
          private_key: 'private-key',
        }),
        FIREBASE_APP_CHECK_ENFORCED: 'true',
        MP_ENV: 'production',
        MP_ACCESS_TOKEN: 'access-token',
        MP_WEBHOOK_SECRET: 'e'.repeat(32),
        MAIL_HOST: 'smtp.example.com',
        MAIL_USER: 'mailer',
        MAIL_PASSWORD: 'mail-secret',
        MAIL_FROM: 'MeatShop <no-reply@example.com>',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        DELIVERY_CODE_SECRET: 'c'.repeat(32),
        DELIVERY_CODE_ENCRYPTION_KEY: 'd'.repeat(32),
      }),
    ).not.toThrow();
  });
});
