import { jest } from '@jest/globals';
import { AuditContextSubscriber } from './audit-context.subscriber';
import { auditRequestContext } from './audit-request-context';

function fixture() {
  const subscriber = new AuditContextSubscriber({ subscribers: [] } as never);
  const runner = {
    data: {} as Record<string, unknown>,
    query: jest.fn(async (_sql: string, _params?: unknown[]) => []),
  };
  const query = (sql: string) =>
    subscriber.beforeQuery({
      connection: { options: { type: 'postgres' } },
      queryRunner: runner,
      query: sql,
    } as never);
  const asUser = (id: number, correlationId: string, action: () => Promise<void>) =>
    auditRequestContext.run({ user: { id }, correlationId } as never, action);
  return { runner, query, asUser };
}

describe('Audit context on pooled PostgreSQL connections', () => {
  it('does not add a database round trip to reads and sets context for a modifying CTE', async () => {
    const { runner, query } = fixture();
    await query('SELECT * FROM users');
    expect(runner.query).not.toHaveBeenCalled();
    await query('WITH changed AS (UPDATE stock SET quantity=1 RETURNING *) SELECT * FROM changed');
    expect(runner.query).toHaveBeenCalledTimes(1);
  });

  it('reuses context on the same runner and replaces it for another user or background write', async () => {
    const { runner, query, asUser } = fixture();
    await asUser(1, 'request-a', async () => {
      await query('INSERT INTO products VALUES(1)');
      await query('UPDATE products SET active=true');
    });
    expect(runner.query).toHaveBeenCalledTimes(1);
    expect(runner.query).toHaveBeenLastCalledWith(expect.any(String), ['1', 'request-a']);
    await asUser(2, 'request-b', () => query('UPDATE products SET active=false'));
    expect(runner.query).toHaveBeenLastCalledWith(expect.any(String), ['2', 'request-b']);
    await query('DELETE FROM products');
    expect(runner.query).toHaveBeenLastCalledWith(expect.any(String), ['', '']);
  });

  it.each([
    'ROLLBACK',
    'ROLLBACK TO SAVEPOINT point',
    'COMMIT',
    'START TRANSACTION',
    'SAVEPOINT point',
    'RELEASE SAVEPOINT point',
  ])('restores context after a transaction boundary: %s', async (boundary) => {
    const { runner, query, asUser } = fixture();
    await asUser(1, 'request-a', async () => {
      await query('UPDATE stock SET quantity=1');
      await query(boundary);
      await query('UPDATE stock SET quantity=2');
    });
    expect(runner.query).toHaveBeenCalledTimes(2);
  });

  it('retries a failed setter and does not leave the recursion guard enabled', async () => {
    const { runner, query } = fixture();
    runner.query.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(query('UPDATE stock SET quantity=1')).rejects.toThrow('database unavailable');
    expect(runner.data.settingAuditContext).toBe(false);
    await query('UPDATE stock SET quantity=1');
    expect(runner.query).toHaveBeenCalledTimes(2);
  });
});
