import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readPositiveInteger } from '../config/runtime-config';
import { AiRateLimit } from './entities/ai-rate-limit.entity';
import { AiRateLimitException } from './ai-rate-limit.exception';

type RateLimitRow = {
  request_count: number | string;
  window_started_at: Date | string;
};

@Injectable()
export class AiRateLimitService {
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(
    config: ConfigService,
    @InjectRepository(AiRateLimit)
    private readonly rateLimits: Repository<AiRateLimit>,
  ) {
    const environment = {
      AI_RATE_LIMIT_MAX: config.get<string>('AI_RATE_LIMIT_MAX'),
      AI_RATE_LIMIT_WINDOW_MS: config.get<string>('AI_RATE_LIMIT_WINDOW_MS'),
    };
    this.limit = readPositiveInteger(environment, 'AI_RATE_LIMIT_MAX', 20);
    this.windowMs = readPositiveInteger(environment, 'AI_RATE_LIMIT_WINDOW_MS', 60_000);
  }

  async consume(userId: number): Promise<void> {
    const rows = (await this.rateLimits.query(
      `INSERT INTO ai_rate_limits (user_id, window_started_at, request_count, updated_at)
       VALUES ($1, NOW(), 1, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         request_count = CASE
           WHEN ai_rate_limits.window_started_at <= NOW() - ($2::bigint * INTERVAL '1 millisecond')
             THEN 1
           ELSE ai_rate_limits.request_count + 1
         END,
         window_started_at = CASE
           WHEN ai_rate_limits.window_started_at <= NOW() - ($2::bigint * INTERVAL '1 millisecond')
             THEN NOW()
           ELSE ai_rate_limits.window_started_at
         END,
         updated_at = NOW()
       RETURNING request_count, window_started_at`,
      [userId, this.windowMs],
    )) as RateLimitRow[];
    const row = rows[0];
    const requestCount = Number(row.request_count);
    if (requestCount > this.limit) {
      const resetAt = new Date(row.window_started_at).getTime() + this.windowMs;
      throw new AiRateLimitException(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)));
    }
  }
}
