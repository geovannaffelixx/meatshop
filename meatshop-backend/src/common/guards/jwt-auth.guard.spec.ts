import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard profile completion', () => {
  const guard = new JwtAuthGuard({ getAllAndOverride: jest.fn() } as any);

  function context(path: string) {
    return {
      switchToHttp: () => ({ getRequest: () => ({ path }) }),
    } as any;
  }

  it('allows an incomplete user to read or complete /users/me', () => {
    const user = { id: 1, profile_complete: false };

    expect(guard.handleRequest(null, user, null, context('/users/me'))).toBe(user);
  });

  it('blocks operational resources until the PostgreSQL profile is complete', () => {
    const user = { id: 1, profile_complete: false };

    expect(() => guard.handleRequest(null, user, null, context('/cart'))).toThrow(
      ForbiddenException,
    );
  });
});
