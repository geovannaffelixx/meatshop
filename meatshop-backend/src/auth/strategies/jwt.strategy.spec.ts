import { JwtStrategy } from './jwt.strategy';
describe('JWT account state', () => {
  it('rejects an inactive account even with a valid signed token', async () => {
    const strategy = new JwtStrategy(
      { getOrThrow: () => 'test-secret' } as never,
      { findOne: async () => ({ id: 1, is_active: false }) } as never,
    );
    await expect(strategy.validate({ sub: 1 } as never)).rejects.toThrow();
  });
  it('returns an active account', async () => {
    const user = { id: 1, is_active: true };
    const strategy = new JwtStrategy(
      { getOrThrow: () => 'test-secret' } as never,
      { findOne: async () => user } as never,
    );
    expect(await strategy.validate({ sub: 1 } as never)).toBe(user);
  });
});
