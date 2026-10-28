import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { CsrfMiddleware } from './csrf.middleware';
import { createCsrfToken } from '../security/csrf';

describe('CSRF middleware mounted under auth', () => {
  const app = express();
  app.use(cookieParser());
  const middleware = new CsrfMiddleware();
  app.use('/auth', middleware.use.bind(middleware));
  app.post('/auth/{*path}', (_req, res) => res.sendStatus(204));

  it.each(['/auth/login', '/auth/register-unit', '/auth/register-unit/?source=web'])(
    'allows public authentication at %s with an existing session cookie',
    async (path) => {
      await request(app).post(path).set('Cookie', 'refresh_token=existing-session').expect(204);
    },
  );

  it.each(['/auth/refresh', '/auth/logout', '/auth/register-unit/private'])(
    'still protects cookie-authenticated mutations at %s',
    async (path) => {
      const response = await request(app).post(path).set('Cookie', 'refresh_token=session').expect(403);
      expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
    },
  );

  it('accepts a protected mutation with a matching CSRF token', async () => {
    const token = createCsrfToken();
    await request(app).post('/auth/refresh')
      .set('Cookie', `refresh_token=session; csrf_token=${token}`)
      .set('x-csrf-token', token).expect(204);
  });
});
