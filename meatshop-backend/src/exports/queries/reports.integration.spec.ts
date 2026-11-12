import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { EntityManager } from 'typeorm';
import type { ExportReportDto } from '../dtos/export-report.dto';
import { catalogReport, performanceReport } from './catalog-report.query';
import { ordersReport } from './orders-report.query';
import { paymentsReport } from './payments-report.query';
import { couponsReport, promotionsReport } from './marketing-report.query';
import { deliveriesReport, reviewsReport, supportReport } from './service-report.query';
import { financeDetails } from './finance-report.query';
import { validateReportDates } from './report-query';

describe('Unit report SQL with isolated PostgreSQL', () => {
  let db: PGlite;
  let manager: EntityManager;
  const filters = {
    unit_id: 1,
    format: 'xlsx',
    report: 'orders',
    month: '2026-11',
  } as ExportReportDto;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(readFileSync(join(__dirname, 'report-fixture.sql'), 'utf8'));
    manager = {
      query: async (sql: string, values: unknown[]) => (await db.query(sql, values)).rows,
    } as EntityManager;
  }, 30000);
  afterAll(async () => {
    await db?.close();
  });

  it('filters order dates without excluding unscheduled orders and includes the end of day', async () => {
    const result = await ordersReport(manager, {
      ...filters,
      date_from: '2026-11-01',
      date_to: '2026-11-01',
    });
    expect(result.rows.map((row) => row.id)).toEqual([6, 1]);
  });
  it('exports catalog stock and applies literal search and availability filters', async () => {
    expect(
      (await catalogReport(manager, { ...filters, stock: 'low', active: 'true' })).rows,
    ).toEqual([expect.objectContaining({ id: 1, quantity: 2.5, minimum: 3 })]);
    expect((await catalogReport(manager, { ...filters, search: '%' })).rows).toEqual([]);
    expect((await catalogReport(manager, { ...filters, search: "' OR 1=1 --" })).rows).toEqual([]);
  });
  it('counts only delivered and received orders, excluding pending payments and other units', async () => {
    expect((await performanceReport(manager, filters)).rows).toEqual([
      expect.objectContaining({ id: 1, quantity: 2, orders: 1, gross: 100 }),
    ]);
  });
  it('calculates net payments and respects the month and payment view', async () => {
    const result = await paymentsReport(manager, filters);
    expect(result.rows.map((row) => row.id)).toEqual([5, 4, 1]);
    expect(result.rows.find((row) => row.id === 1)?.net).toBe(88);
    expect((await paymentsReport(manager, { ...filters, view: 'receivable' })).rows).toEqual([]);
  });
  it('limits global coupon usage and discounts to this unit', async () => {
    const result = await couponsReport(manager, filters);
    expect(result.rows.map((row) => row.code)).not.toContain('OTHER');
    expect(result.rows.find((row) => row.code === 'GLOBAL')).toEqual(
      expect.objectContaining({ uses: 1, discounts: 5 }),
    );
  });
  it('scopes promotions, delivery people and reviews to the unit', async () => {
    expect((await promotionsReport(manager, { ...filters, status: 'Ativa' })).rows).toHaveLength(1);
    expect((await deliveriesReport(manager, { ...filters, search: 'ana@' })).rows).toHaveLength(1);
    expect((await reviewsReport(manager, { ...filters, product_id: 'unit' })).rows).toHaveLength(1);
    expect((await reviewsReport(manager, { ...filters, product_id: '1' })).rows).toHaveLength(1);
  });
  it('includes all callers in the unit and filters support status', async () => {
    expect((await supportReport(manager, { ...filters, status: 'OPEN' })).rows).toHaveLength(2);
    expect((await supportReport(manager, { ...filters, status: 'CLOSED' })).rows).toEqual([]);
  });
  it('scopes expenses and delivery settlements to the same month and unit', async () => {
    const [expenses, settlements] = await financeDetails(manager, filters);
    expect(expenses.rows).toEqual([expect.objectContaining({ paid: 20 })]);
    expect(settlements.rows).toEqual([expect.objectContaining({ amount: 5 })]);
  });
  it('rejects invalid and reversed periods', () => {
    expect(() => validateReportDates({ ...filters, date_from: '2026-02-30' })).toThrow();
    expect(() =>
      validateReportDates({ ...filters, date_from: '2026-11-02', date_to: '2026-11-01' }),
    ).toThrow();
  });
});
