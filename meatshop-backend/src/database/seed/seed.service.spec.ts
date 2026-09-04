import { SeedService } from './seed.service';

describe('SeedService safety guard', () => {
  const repositories = Array.from({ length: 12 }, () => ({}));
  it('does nothing unless explicitly enabled', async () => {
    const previous = process.env.SEED_ENABLED;
    try {
      delete process.env.SEED_ENABLED;
      const service = new SeedService(
        ...(repositories as ConstructorParameters<typeof SeedService>),
      );
      await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    } finally {
      process.env.SEED_ENABLED = previous;
    }
  });

  it('refuses to seed a production environment', async () => {
    const previousSeed = process.env.SEED_ENABLED;
    const previousEnvironment = process.env.NODE_ENV;
    try {
      process.env.SEED_ENABLED = 'true';
      process.env.NODE_ENV = 'production';
      const service = new SeedService(
        ...(repositories as ConstructorParameters<typeof SeedService>),
      );
      await expect(service.onApplicationBootstrap()).rejects.toThrow(
        'Development seed cannot run with NODE_ENV=production',
      );
    } finally {
      process.env.SEED_ENABLED = previousSeed;
      process.env.NODE_ENV = previousEnvironment;
    }
  });
});
