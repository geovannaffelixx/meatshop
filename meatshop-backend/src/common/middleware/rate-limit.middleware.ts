import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { readPositiveInteger } from '../../config/runtime-config';

type RateLimitEntry = { count: number; resetAt: number };

const MAX_TRACKED_CLIENTS = 10_000;

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly entries = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly limit: number;

  constructor(config: ConfigService) {
    const environment = {
      RATE_LIMIT_WINDOW_MS: config.get<string>('RATE_LIMIT_WINDOW_MS'),
      RATE_LIMIT_MAX: config.get<string>('RATE_LIMIT_MAX'),
    };
    this.windowMs = readPositiveInteger(environment, 'RATE_LIMIT_WINDOW_MS', 60_000);
    this.limit = readPositiveInteger(environment, 'RATE_LIMIT_MAX', 120);
  }

  use(request: Request, response: Response, next: NextFunction): void {
    const now = Date.now();
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const previous = this.entries.get(key);
    const entry =
      !previous || previous.resetAt <= now
        ? { count: 1, resetAt: now + this.windowMs }
        : { ...previous, count: previous.count + 1 };

    this.entries.set(key, entry);
    this.evictExpiredEntries(now);
    response.setHeader('RateLimit-Limit', this.limit);
    response.setHeader('RateLimit-Remaining', Math.max(0, this.limit - entry.count));
    response.setHeader('RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > this.limit) {
      response.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      response.status(429).json({
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Try again later.',
      });
      return;
    }
    next();
  }

  private evictExpiredEntries(now: number): void {
    if (this.entries.size <= MAX_TRACKED_CLIENTS) return;

    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }

    while (this.entries.size > MAX_TRACKED_CLIENTS) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }
}
