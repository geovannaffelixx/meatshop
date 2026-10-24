import { jest } from '@jest/globals';
import { lastValueFrom, of } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';

describe('Durable audit admission', () => {
  it('does not execute the mutation when recording its intent fails', async () => {
    const audit = {
      record: jest.fn(async () => {
        throw new Error('storage unavailable');
      }),
      contextFromRequest: () => ({ userId: 7 }),
    };
    const interceptor = new AuditLogInterceptor({ query: async () => [] } as never, audit as never);
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', path: '/products', params: {} }),
      }),
    };
    const next = { handle: jest.fn(() => of({ id: 1 })) };
    await expect(lastValueFrom(interceptor.intercept(context as never, next))).rejects.toThrow(
      'storage unavailable',
    );
    expect(next.handle).not.toHaveBeenCalled();
  });
});
