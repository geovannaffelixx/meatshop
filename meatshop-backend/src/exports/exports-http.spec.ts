import { Global, Module, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuditModule } from '../audit/audit.module';
import { GlobalRole } from '../common/enums/global-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AppLogger } from '../common/logger/app.logger';
import { FirebaseService } from '../integrations/firebase/firebase.service';
import { MediaStorageService } from '../storage/media-storage.service';
import { Unit } from '../units/entities/unit.entity';
import { UnitAuthorizationService } from '../units/services/unit-authorization.service';
import { BuildUnitReportUseCase } from './build-unit-report.use-case';
import { ExportsModule } from './exports.module';

const repository = { insert: async () => undefined, create: (value: unknown) => value };
const source = {
  options: { type: 'postgres' },
  entityMetadatas: [],
  subscribers: [],
  getRepository: (entity: unknown) => ({
    ...repository,
    findOneBy: async ({ user_id: userId }: { user_id?: number }) =>
      entity === Unit
        ? { id: 1, name: 'Unidade teste' }
        : userId === 1
          ? { local_role: 'OWNER' }
          : { local_role: 'OPERATOR' },
  }),
};

@Global()
@Module({
  providers: [
    { provide: DataSource, useValue: source },
    { provide: ConfigService, useValue: new ConfigService() },
    { provide: FirebaseService, useValue: {} },
    { provide: MediaStorageService, useValue: {} },
    { provide: AppLogger, useValue: {} },
  ],
  exports: [DataSource, ConfigService, FirebaseService, MediaStorageService, AppLogger],
})
class TestInfrastructure {}

describe('Export HTTP contracts and module wiring', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [TestInfrastructure, ExportsModule, AuditModule],
    })
      .overrideProvider(UnitAuthorizationService)
      .useValue({ resolveRequiredUnitId: async () => 1 })
      .overrideProvider(BuildUnitReportUseCase)
      .useValue({
        execute: async () => ({
          title: 'Pedidos',
          unit: { id: 1, name: 'Unidade teste' },
          generatedAt: new Date(),
          filters: [],
          sections: [
            { title: 'Pedidos', columns: [{ key: 'id', label: 'Pedido' }], rows: [{ id: 1 }] },
          ],
        }),
      })
      .compile();
    app = module.createNestApplication();
    app.use(
      (
        req: { headers: Record<string, string>; user?: unknown },
        _res: unknown,
        next: () => void,
      ) => {
        req.user = {
          id: Number(req.headers['x-test-user'] ?? 1),
          global_role: req.headers['x-test-admin'] ? GlobalRole.SUPER_ADMIN : GlobalRole.USER,
        };
        next();
      },
    );
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalGuards(new RolesGuard(new Reflector()));
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('returns an Excel attachment with no-store headers for OWNER', async () => {
    const result = await request(app.getHttpServer())
      .get('/exports/reports?unit_id=1&report=orders&format=xlsx')
      .expect(200);
    expect(result.headers['content-type']).toContain('spreadsheetml');
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.headers['content-disposition']).toContain('.xlsx');
  });
  it('rejects invalid formats and missing units before querying report data', async () => {
    await request(app.getHttpServer())
      .get('/exports/reports?unit_id=1&report=orders&format=csv')
      .expect(400);
    await request(app.getHttpServer()).get('/exports/reports?report=orders&format=pdf').expect(400);
  });
  it('rejects operators and rejects JSON for OWNER', async () => {
    await request(app.getHttpServer())
      .get('/exports/reports?unit_id=1&report=orders&format=pdf')
      .set('x-test-user', '2')
      .expect(403);
    await request(app.getHttpServer())
      .get('/exports/reports?unit_id=1&report=orders&format=json')
      .expect(403);
  });
  it('allows JSON for SUPER_ADMIN while keeping audit exports admin-only', async () => {
    await request(app.getHttpServer())
      .get('/exports/reports?unit_id=1&report=orders&format=json')
      .set('x-test-admin', 'true')
      .expect(200);
    await request(app.getHttpServer()).get('/audit-logs/export?unit_id=1&format=pdf').expect(403);
  });
});
