import { randomBytes, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

export const CSRF_COOKIE = 'csrf_token';
export const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/register-unit',
  '/auth/mobile/password',
  '/auth/firebase/exchange',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/webhooks/mercadopago',
]);

export function createCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function requiresCsrf(request: Request): boolean {
  // Mounted middleware sees a path relative to its mount point in Express.
  const path = (request.originalUrl || request.path).split('?')[0].replace(/\/+$/, '') || '/';
  if (SAFE_METHODS.has(request.method) || EXEMPT_PATHS.has(path)) return false;
  if (/^Bearer\s+\S+$/i.test(request.get('authorization') ?? '')) return false;
  return Boolean(request.cookies?.access_token || request.cookies?.refresh_token);
}

export function validCsrfToken(cookie: unknown, header: unknown): boolean {
  if (typeof cookie !== 'string' || typeof header !== 'string') return false;
  if (!/^[a-f0-9]{64}$/.test(cookie) || !/^[a-f0-9]{64}$/.test(header)) return false;
  return timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
}
