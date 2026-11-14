import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { DataSource, EntityManager } from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import type { ExportPersonalDataUseCase } from '../../users/use-cases/export-personal-data.use-case';
import { BuildDeliveryReportService } from './build-delivery-report.service';
import {
  deliveryEarningsReport,
  deliveryHistoryReport,
  deliverySettlementsReport,
} from './queries/delivery-earnings.query';
import { deliveryExpensesReport } from './queries/delivery-expenses.query';
import { deliverySupportReport } from './queries/delivery-support.query';
import type { DeliveryExportDto } from './dtos/delivery-export.dto';
import { queryReportSection } from '../../exports/queries/query-report-section';

describe('Delivery personal reports with isolated PostgreSQL', () => {
  let db: PGlite;
  let manager: EntityManager;
  const filters: DeliveryExportDto = {
    report: 'earnings',
    format: 'xlsx',
    from: '2026-11-01',
    to: '2026-11-30',
  };
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(
      readFileSync(join(__dirname, '../../exports/queries/report-fixture.sql'), 'utf8'),
    );
    await db.exec(`CREATE TABLE units(id int PRIMARY KEY,name text);
      INSERT INTO units VALUES(1,'Centro'),(2,'Filial');
      ALTER TABLE orders ADD COLUMN delivery_status text, ADD COLUMN delivery_verified_at timestamptz, ADD COLUMN updated_at timestamptz, ADD COLUMN is_scheduled boolean DEFAULT false, ADD COLUMN pickup_verified_at timestamptz;
      UPDATE orders SET delivery_status=CASE WHEN status='DELIVERED' THEN 'DELIVERED' END,delivery_verified_at=order_date,updated_at=order_date,pickup_verified_at=order_date - INTERVAL '20 minutes';
      UPDATE orders SET updated_at='2026-12-15 12:00Z' WHERE id=1;
      INSERT INTO orders(id,unit_id,client_id,order_date,status,delivery_status,delivery_fee,delivery_person_id,updated_at,delivery_verified_at) VALUES(7,2,2,'2026-11-02 12:00Z','DELIVERED','DELIVERED',8,1,'2026-11-02 12:00Z','2026-11-02 12:00Z');
      INSERT INTO delivery_settlements VALUES(3,1,5,'2026-11-10 12:00Z','OLD-DELIVERY');
      CREATE TABLE delivery_expenses(id int,user_id int,category text,description text,amount numeric,incurred_on date);
      INSERT INTO delivery_expenses VALUES(1,1,'FUEL','Combustível',2.50,'2026-11-01'),(2,1,'MAINTENANCE','Manutenção',1.20,'2026-11-02'),(3,2,'FUEL','Outro entregador',999,'2026-11-01');
      CREATE TABLE support_messages(id int,ticket_id int,sender_id int,message text,created_at timestamptz);
      UPDATE support_tickets SET created_at='2026-11-01 12:00Z';
      INSERT INTO support_messages VALUES(1,1,1,'Minha mensagem','2026-11-01 12:00Z'),(2,2,2,'Conversa privada de outra conta','2026-11-01 12:00Z');`);
    manager = {
      query: async (sql: string, values: unknown[]) => (await db.query(sql, values)).rows,
    } as EntityManager;
  }, 30000);
  afterAll(async () => {
    await db?.close();
  });

  it('scopes to the driver across all units and uses stable completion dates', async () => {
    const report = await deliveryEarningsReport(manager, 1, filters);
    expect(report.rows.map((row) => row.order_id)).toEqual([7, 6, 1]);
    expect(report.rows.find((row) => row.order_id === 7)).toMatchObject({
      amount: 8,
      received: 0,
      pending: 8,
    });
    expect(report.rows.find((row) => row.order_id === 1)).toMatchObject({
      amount: 5,
      received: 5,
      pending: 0,
    });
  });
  it('distinguishes received and pending earnings', async () => {
    expect(
      (await deliveryEarningsReport(manager, 1, { ...filters, payment: 'received' })).rows.map(
        (row) => row.order_id,
      ),
    ).toEqual([1]);
    expect(
      (await deliveryEarningsReport(manager, 1, { ...filters, payment: 'pending' })).rows.map(
        (row) => row.order_id,
      ),
    ).toEqual([7, 6]);
  });
  it('keeps delivery history operational and separate from earnings', async () => {
    const history = await deliveryHistoryReport(manager, 1, { ...filters, report: 'history' });
    expect(history.rows.map((row) => row.order_id)).toEqual([7, 6, 1]);
    expect(history.columns.map((column) => column.key)).toEqual([
      'order_id',
      'unit',
      'delivery_type',
      'scheduled',
      'pickup_at',
      'completed_at',
    ]);
    expect(history.columns.map((column) => column.key)).not.toContain('amount');
  });
  it('includes receipts by payment date even for deliveries from a previous period', async () => {
    const paid = await deliverySettlementsReport(manager, 1, filters);
    expect(paid.rows.map((row) => row.order_id)).toEqual([3, 1]);
    expect(paid.rows.every((row) => row.amount === 5)).toBe(true);
  });
  it('exports only own expenses and applies category filters', async () => {
    const expenses = await deliveryExpensesReport(manager, 1, { ...filters, category: 'FUEL' });
    expect(expenses.rows).toEqual([expect.objectContaining({ amount: 2.5, category: 'FUEL' })]);
  });
  it('does not disclose another caller’s support messages', async () => {
    const [tickets, messages] = await deliverySupportReport(manager, 1, filters);
    expect(tickets.rows).toHaveLength(1);
    expect(messages.rows).toEqual([
      expect.objectContaining({ ticket_id: 1, message: 'Minha mensagem' }),
    ]);
  });
  it('calculates cash result from receipt dates minus personal expenses', async () => {
    const source = {
      transaction: async (_level: string, work: (value: EntityManager) => unknown) => work(manager),
    } as DataSource;
    const service = new BuildDeliveryReportService(source, {} as ExportPersonalDataUseCase);
    const report = await service.build(
      { ...filters, report: 'financial' },
      { id: 1, name: 'Ana' } as User,
      1,
    );
    expect(report.unit).toBeUndefined();
    expect(report.person).toEqual({ id: 1, name: 'Ana' });
    const rows = report.sections[0].rows;
    expect(rows.find((row) => row.indicator === 'Recebimentos pela data do acerto')?.amount).toBe(
      10,
    );
    expect(rows.find((row) => row.indicator === 'Despesas pessoais do período')?.amount).toBe(3.7);
    expect(rows.find((row) => String(row.indicator).startsWith('Resultado de caixa'))?.amount).toBe(
      6.3,
    );
  });
  it('rejects reversed dates and filters that do not apply to a report', async () => {
    const service = new BuildDeliveryReportService(
      {} as DataSource,
      {} as ExportPersonalDataUseCase,
    );
    await expect(
      service.build({ ...filters, from: '2026-12-01' }, {} as User, 1),
    ).rejects.toThrow();
    await expect(
      service.build({ ...filters, report: 'financial', category: 'FUEL' }, {} as User, 1),
    ).rejects.toThrow();
    await expect(
      service.build({ ...filters, report: 'history', payment: 'received' }, {} as User, 1),
    ).rejects.toThrow();
  });
  it('returns an actionable error instead of silently truncating a large report', async () => {
    const large = {
      query: async () => Array.from({ length: 10001 }, () => ({ amount: 1 })),
    } as unknown as EntityManager;
    await expect(queryReportSection(large, 'Teste', [], 'SELECT 1', [])).rejects.toMatchObject({
      response: { code: 'EXPORT_TOO_LARGE' },
    });
  });
});
