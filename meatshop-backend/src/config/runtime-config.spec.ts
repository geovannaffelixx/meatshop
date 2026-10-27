import { getAllowedOrigins, readPositiveInteger, validateEnvironment } from './runtime-config';

describe('runtime config', () => {
  it('normalizes and deduplicates configured origins', () => {
    expect(
      getAllowedOrigins({
        CORS_ORIGINS: 'https://app.example.com/, https://app.example.com',
      }),
    ).toEqual(['https://app.example.com']);
  });

  it('rejects invalid positive integers', () => {
    expect(() => readPositiveInteger({ RATE_LIMIT_MAX: '0' }, 'RATE_LIMIT_MAX', 120)).toThrow();
  });

  it('rejects insecure production configuration', () => {
    expect(() =>
      validateEnvironment({
        DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
        DATA_HASH_KEY: Buffer.alloc(32, 2).toString('base64'),
        METRICS_TOKEN: 'm'.repeat(32),
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

  it.each([
    ['production', 'true'],
    ['production', 'false'],
    ['sandbox', 'true'],
    ['sandbox', 'false'],
  ])(
    'validates a secure production server with MP_ENV=%s and PAYMENTS_ENABLED=%s',
    (mpEnv, enabled) => {
      const environment = {
        DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
        DATA_HASH_KEY: Buffer.alloc(32, 2).toString('base64'),
        METRICS_TOKEN: 'm'.repeat(32),
        NODE_ENV: 'production',
        DB_TYPE: 'postgres',
        FIREBASE_WEB_API_KEY: 'public-api-key',
        DB_HOST: 'database.internal',
        DB_USERNAME: 'meatshop',
        DB_PASSWORD: 'database-secret',
        DB_DATABASE: 'meatshop',
        DB_SYNCHRONIZE: 'false',
        DB_SSL: 'true',
        CORS_ORIGINS: 'https://app.example.com',
        BACKEND_PUBLIC_URL: 'https://api.example.com',
        FRONTEND_URL: 'https://app.example.com',
        COOKIE_SECURE: 'true',
        FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
          project_id: 'example',
          client_email: 'firebase@example.com',
          private_key: 'private-key',
        }),
        FIREBASE_APP_CHECK_ENFORCED: 'true',
        MP_ENV: mpEnv,
        PAYMENTS_ENABLED: enabled,
        MP_CLIENT_ID: 'app-id',
        MP_CLIENT_SECRET: 'client-secret',
        MP_OAUTH_REDIRECT_URI: 'https://api.example.com/payments/sellers/oauth/callback',
        MP_CREDENTIAL_ENCRYPTION_KEY: 'f'.repeat(32),
        MP_WEBHOOK_SECRET: 'e'.repeat(32),
        MAIL_HOST: 'smtp.example.com',
        MAIL_USER: 'mailer',
        MAIL_PASSWORD: 'mail-secret',
        MAIL_FROM: 'MeatShop <no-reply@example.com>',
        CLOUDINARY_CLOUD_NAME: 'meatshop',
        CLOUDINARY_API_KEY: 'cloudinary-key',
        CLOUDINARY_API_SECRET: 'cloudinary-secret',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        DELIVERY_CODE_SECRET: 'c'.repeat(32),
        DELIVERY_CODE_ENCRYPTION_KEY: 'd'.repeat(32),
      };
      expect(() => validateEnvironment(environment)).not.toThrow();
      for (const missingKey of [undefined, '', '   ']) {
        expect(() =>
          validateEnvironment({ ...environment, FIREBASE_WEB_API_KEY: missingKey }),
        ).toThrow('FIREBASE_WEB_API_KEY is required in production');
      }
      for (const invalid of [undefined, '', 'test', 'prod']) {
        expect(() => validateEnvironment({ ...environment, MP_ENV: invalid })).toThrow(
          'MP_ENV must be sandbox or production',
        );
      }
      expect(() => validateEnvironment({ ...environment, MP_WEBHOOK_SECRET: 'short' })).toThrow();
      expect(() =>
        validateEnvironment({ ...environment, MP_CREDENTIAL_ENCRYPTION_KEY: 'short' }),
      ).toThrow();
      expect(() =>
        validateEnvironment({ ...environment, MP_OAUTH_REDIRECT_URI: 'http://localhost' }),
      ).toThrow();
    },
  );
});

describe('Replica safeguards', () => {
  it('rejects multiple replicas without shared realtime', () => {
    expect(() => validateEnvironment({ BACKEND_REPLICAS: '2' })).toThrow('SOCKET_IO_SHARED');
  });
});
