/* global require */
import 'reflect-metadata';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { INestApplication, Type } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { getRepositoryToken } from '@nestjs/typeorm';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthModule } from '../../auth/auth.module';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../../users/entities/user.entity';

function controllerFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? controllerFiles(join(directory, entry.name))
      : entry.name.endsWith('.controller.ts')
        ? [join(directory, entry.name)]
        : [],
  );
}
const controllers = controllerFiles(join(__dirname, '../..')).flatMap((file) =>
  Object.values(require(file) as Record<string, unknown>).filter(
    (value) => typeof value === 'function' && Reflect.hasMetadata(PATH_METADATA, value),
  ),
) as Type<object>[];
const reflector = new Reflector();
const routes = controllers.flatMap((controller) =>
  Object.getOwnPropertyNames(controller.prototype).flatMap((name) => {
    const handler = controller.prototype[name];
    const method: RequestMethod | undefined = Reflect.getMetadata(METHOD_METADATA, handler);
    if (method === undefined) return [];
    const path =
      '/' +
      [Reflect.getMetadata(PATH_METADATA, controller), Reflect.getMetadata(PATH_METADATA, handler)]
        .filter((value) => value && value !== '/')
        .join('/');
    return [
      {
        controller,
        handler,
        method: RequestMethod[method].toLowerCase() as 'get' | 'post' | 'patch' | 'put' | 'delete',
        path,
        public: reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler, controller]) === true,
        roles: reflector.getAllAndOverride<string[]>(ROLES_KEY, [handler, controller]) ?? [],
      },
    ];
  }),
);
const publicRoutes = [
  'GET /',
  'GET /health',
  'GET /auth/csrf',
  'POST /auth/mobile/password',
  'POST /auth/firebase/exchange',
  'POST /auth/register',
  'POST /auth/register-unit',
  'POST /auth/login',
  'POST /auth/logout',
  'POST /auth/refresh',
  'POST /auth/forgot-password',
  'POST /auth/reset-password',
  'POST /auth/verify-email',
  'GET /categories',
  'GET /categories/:id',
  'GET /sales',
  'GET /legal/documents',
  'GET /legal/documents/:id',
  'GET /mercadopago/capabilities',
  'POST /webhooks/mercadopago',
  'GET /metrics',
  'POST /monitoring/alerts',
  'GET /orders/available-slots',
  'GET /payments/sellers/oauth/callback',
  'GET /products',
  'GET /products/:id',
  'GET /promotions',
  'GET /promotions/:id',
  'GET /recipes',
  'GET /recipes/:id',
  'GET /reviews',
  'GET /reviews/:id',
  'GET /delivery-persons/:deliveryPersonId/reviews',
  'GET /search/brands',
  'GET /search',
  'GET /units',
  'GET /units/:unitId/business-hours',
  'GET /units/:id',
  'POST /geocoding/resolve',
];
const protectedRoutes = routes.filter((route) => !route.public);
const secret = 'isolated-route-access-regression-secret-with-no-real-credentials';

describe('Authentication on every HTTP controller route (isolated handlers)', () => {
  let app: INestApplication;
  const tokens = new JwtService({ secret });
  function send(method: (typeof routes)[number]['method'], url: string) {
    const client = request(app.getHttpServer());
    return client[method](url);
  }
  beforeAll(async () => {
    const users = new Map([
      [1, { id: 1, global_role: 'USER', is_active: true, profile_complete: true }],
      [2, { id: 2, global_role: 'USER', is_active: false, profile_complete: true }],
    ]);
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers,
      providers: [
        Reflector,
        JwtStrategy,
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: async ({ where }: { where: { id: number } }) => users.get(where.id) ?? null,
          },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    })
      .useMocker(
        () =>
          new Proxy({}, { get: (_target, key) => (key === 'then' ? undefined : async () => ({})) }),
      )
      .compile();
    app = module.createNestApplication({ logger: false });
    app.use(cookieParser());
    await app.init();
  }, 60000);
  afterAll(async () => {
    await app?.close();
  });

  it('keeps production authentication and role guards global', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AuthModule) as Array<{
      provide?: unknown;
      useClass?: unknown;
    }>;
    expect(providers).toEqual(
      expect.arrayContaining([
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ]),
    );
  });
  it('requires explicit review before adding another public endpoint', () => {
    expect(
      routes
        .filter((route) => route.public)
        .map((route) => `${route.method.toUpperCase()} ${route.path}`)
        .sort(),
    ).toEqual(publicRoutes.sort());
    expect(protectedRoutes.length).toBeGreaterThan(170);
  });

  describe.each(protectedRoutes)('$method $path', (route) => {
    const url = route.path.replace(/:[^/]+/g, '1');
    it('rejects a request without credentials', async () => {
      await send(route.method, url).expect(401);
    });
    it('rejects a fabricated session cookie', async () => {
      await send(route.method, url)
        .set('Cookie', 'access_token=fabricated; refresh_token=fabricated')
        .expect(401);
    });
    it('rejects an expired token', async () => {
      await send(route.method, url)
        .set('Authorization', `Bearer ${tokens.sign({ sub: 1 }, { expiresIn: -10 })}`)
        .expect(401);
    });
    it('rejects a token signed with another key', async () => {
      await send(route.method, url)
        .set('Authorization', `Bearer ${tokens.sign({ sub: 1 }, { secret: 'wrong-key' })}`)
        .expect(401);
    });
    it('rejects a valid token belonging to a disabled user', async () => {
      await send(route.method, url)
        .set('Authorization', `Bearer ${tokens.sign({ sub: 2 })}`)
        .expect(401);
    });
  });
  it.each(routes.filter((route) => route.roles.includes('SUPER_ADMIN')))(
    'rejects a normal account at $method $path',
    async (route) => {
      await send(route.method, route.path.replace(/:[^/]+/g, '1'))
        .set('Authorization', `Bearer ${tokens.sign({ sub: 1 })}`)
        .expect(403);
    },
  );
});
