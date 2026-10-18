import { describe, expect, it, jest } from '@jest/globals';
import type { ExecutionContext } from '@nestjs/common';
import { LegalAccessGuard } from './legal-access.guard';
import type { LegalPolicyService } from './services/legal-policy.service';

function fixture(path: string, user: { id: number } | undefined = { id: 7 }) {
  const policy = { assertUser: jest.fn(async (_id: number) => undefined) };
  const guard = new LegalAccessGuard(policy as unknown as LegalPolicyService);
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ path, user }) }),
  } as unknown as ExecutionContext;
  return { guard, context, policy };
}

describe('LegalAccessGuard', () => {
  it.each([
    '/legal/pending',
    '/legal/acceptances',
    '/users/me',
    '/support/tickets',
    '/auth/logout',
    '/units/mine',
  ])('preserves recovery access to %s', async (path) => {
    const { guard, context, policy } = fixture(path);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(policy.assertUser).not.toHaveBeenCalled();
  });

  it('checks protected operations regardless of the client', async () => {
    const { guard, context, policy } = fixture('/orders');
    await guard.canActivate(context);
    expect(policy.assertUser).toHaveBeenCalledWith(7);
  });
});
