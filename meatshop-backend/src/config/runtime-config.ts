const LOCAL_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const MINIMUM_SECRET_LENGTH = 32;
type Environment = Record<string, string | undefined>;

export function getAllowedOrigins(environment: Environment): string[] {
  const configured = environment.CORS_ORIGINS ?? environment.FRONTEND_URL;
  if (!configured) return LOCAL_ORIGINS;

  const origins = configured
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (origins.length === 0) throw new Error('CORS_ORIGINS must contain at least one origin');
  origins.forEach((origin) => assertValidOrigin(origin));
  return [...new Set(origins)];
}

export function readPositiveInteger(
  environment: Environment,
  name: string,
  fallback: number,
): number {
  const value = Number(environment[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function validateEnvironment(environment: Environment): void {
  getAllowedOrigins(environment);
  readPositiveInteger(environment, 'RATE_LIMIT_WINDOW_MS', 60_000);
  readPositiveInteger(environment, 'RATE_LIMIT_MAX', 120);
  readPositiveInteger(environment, 'DELIVERY_TRACKING_RETENTION_DAYS', 30);

  if (environment.NODE_ENV !== 'production') return;
  if (environment.DB_TYPE !== 'postgres') throw new Error('Production requires PostgreSQL');
  if (environment.DB_SYNCHRONIZE === 'true') {
    throw new Error('DB_SYNCHRONIZE must be false in production');
  }
  if (environment.DB_SSL !== 'true') throw new Error('DB_SSL must be true in production');

  [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DELIVERY_CODE_SECRET',
    'DELIVERY_CODE_ENCRYPTION_KEY',
    'MP_WEBHOOK_SECRET',
  ].forEach((name) => assertStrongSecret(environment, name));
  if (!environment.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is required in production');
  }
  assertFirebaseServiceAccount(environment.FIREBASE_SERVICE_ACCOUNT);
  [
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'BACKEND_PUBLIC_URL',
    'MP_ACCESS_TOKEN',
    'MAIL_HOST',
    'MAIL_USER',
    'MAIL_PASSWORD',
    'MAIL_FROM',
  ].forEach((name) => assertRequired(environment, name));
  if (environment.FIREBASE_APP_CHECK_ENFORCED !== 'true') {
    throw new Error('FIREBASE_APP_CHECK_ENFORCED must be true in production');
  }
  if (environment.MP_ENV !== 'production') {
    throw new Error('MP_ENV must be production');
  }
  if (environment.SWAGGER_ENABLED === 'true') {
    throw new Error('SWAGGER_ENABLED must be false in production');
  }

  for (const origin of getAllowedOrigins(environment)) {
    if (!origin.startsWith('https://')) throw new Error('Production CORS origins must use HTTPS');
  }
  if (environment.COOKIE_SECURE !== 'true') {
    throw new Error('COOKIE_SECURE must be true in production');
  }
  if (!environment.BACKEND_PUBLIC_URL?.startsWith('https://')) {
    throw new Error('BACKEND_PUBLIC_URL must use HTTPS in production');
  }
}

function assertValidOrigin(origin: string): void {
  const parsed = new URL(origin);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
    throw new Error(`Invalid CORS origin: ${origin}`);
  }
}

function assertStrongSecret(environment: Environment, name: string): void {
  const secret = environment[name];
  if (!secret || secret.length < MINIMUM_SECRET_LENGTH || /local-demo|change-me/i.test(secret)) {
    throw new Error(`${name} must contain at least ${MINIMUM_SECRET_LENGTH} non-demo characters`);
  }
}

function assertRequired(environment: Environment, name: string): void {
  if (!environment[name]?.trim()) throw new Error(`${name} is required in production`);
}

function assertFirebaseServiceAccount(raw: string): void {
  let credential: unknown;
  try {
    credential = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must be valid JSON');
  }

  if (!credential || typeof credential !== 'object') {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must be a JSON object');
  }
  const fields = credential as Record<string, unknown>;
  for (const name of ['project_id', 'client_email', 'private_key']) {
    if (typeof fields[name] !== 'string' || !fields[name]) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT is missing ${name}`);
    }
  }
}
