import { ConfigService } from '@nestjs/config';
import { describe, expect, it, jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import { AiRateLimitException } from './ai-rate-limit.exception';
import { AiRateLimitService } from './ai-rate-limit.service';
import type { AiRateLimit } from './entities/ai-rate-limit.entity';

describe('AiRateLimitService', () => {
  type Row = { request_count: number; window_started_at: Date };

  it('uses an atomic PostgreSQL upsert keyed by authenticated user', async () => {
    const query = jest
      .fn<() => Promise<Row[]>>()
      .mockResolvedValue([{ request_count: 1, window_started_at: new Date() }]);
    const limiter = new AiRateLimitService(
      new ConfigService({
        AI_RATE_LIMIT_MAX: '1',
        AI_RATE_LIMIT_WINDOW_MS: '60000',
      }),
      { query } as unknown as Repository<AiRateLimit>,
    );

    await expect(limiter.consume(42)).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (user_id)'),
      [42, 60000],
    );
  });

  it('rejects a count over the configured limit', async () => {
    const limiter = new AiRateLimitService(
      new ConfigService({
        AI_RATE_LIMIT_MAX: '1',
        AI_RATE_LIMIT_WINDOW_MS: '60000',
      }),
      {
        query: jest
          .fn<() => Promise<Row[]>>()
          .mockResolvedValue([{ request_count: 2, window_started_at: new Date() }]),
      } as unknown as Repository<AiRateLimit>,
    );

    await expect(limiter.consume(1)).rejects.toBeInstanceOf(AiRateLimitException);
  });
});
