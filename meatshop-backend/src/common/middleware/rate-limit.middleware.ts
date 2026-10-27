import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { readPositiveInteger } from '../../config/runtime-config';
import { MetricsService } from '../../metrics/metrics.service';

type RateLimitEntry = { count: number; reset_at: Date | string };

const BEARER_PREFIX = 'Bearer ';
const ACCESS_TOKEN_COOKIE = 'access_token';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly windowMs: number;
  private readonly limit: number;
  private readonly jwt: JwtService | null;
  private nextCleanup = 0;

  constructor(
    config: ConfigService,
    private readonly db: DataSource,
    private readonly metrics: MetricsService,
  ) {
    const environment = {
      RATE_LIMIT_WINDOW_MS: config.get<string>('RATE_LIMIT_WINDOW_MS'),
      RATE_LIMIT_MAX: config.get<string>('RATE_LIMIT_MAX'),
    };
    this.windowMs = readPositiveInteger(environment, 'RATE_LIMIT_WINDOW_MS', 60_000);
    this.limit = readPositiveInteger(environment, 'RATE_LIMIT_MAX', 120);
    const secret = config.get<string>('JWT_SECRET');
    this.jwt = secret ? new JwtService({ secret, verifyOptions: { algorithms: ['HS256'] } }) : null;
  }

  async use(request: Request, response: Response, next: NextFunction): Promise<void> {
    if (request.method === 'POST' && request.path === '/webhooks/mercadopago') return next();
    try {
      const entry = await this.consume(request);
      const resetAt = new Date(entry.reset_at).getTime();
      response.setHeader('RateLimit-Limit', this.limit);
      response.setHeader('RateLimit-Remaining', Math.max(0, this.limit - entry.count));
      response.setHeader('RateLimit-Reset', Math.ceil(resetAt / 1000));
      if (entry.count <= this.limit) return next();
      this.metrics.observeRateLimitRejection('http');
      response.setHeader('Retry-After', Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)));
      response.status(429).json({
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Try again later.',
      });
    } catch (error) {
      next(error);
    }
  }

  private rateLimitKey(request: Request): string {
    const userId = this.authenticatedUserId(request);
    if (userId !== null) return `user:${userId}`;
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    return `http:${createHash('sha256').update(ip).digest('hex')}`;
  }

  private authenticatedUserId(request: Request): number | null {
    const token = this.accessToken(request);
    if (!token || !this.jwt) return null;
    try {
      const payload = this.jwt.verify<{ sub?: unknown }>(token);
      return Number.isSafeInteger(payload.sub) ? (payload.sub as number) : null;
    } catch {
      return null;
    }
  }

  private accessToken(request: Request): string | null {
    const header = request.headers?.authorization;
    if (header?.startsWith(BEARER_PREFIX)) return header.slice(BEARER_PREFIX.length).trim();
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
  }

  private async consume(request: Request): Promise<RateLimitEntry> {
    const key = this.rateLimitKey(request);
    const rows: RateLimitEntry[] = await this.db.query(
      `
      INSERT INTO rate_limit_counters AS counters (key, window_started_at, request_count)
      VALUES ($1, clock_timestamp(), 1)
      ON CONFLICT (key) DO UPDATE SET
        request_count = CASE WHEN counters.window_started_at + $2 * interval '1 millisecond' <= clock_timestamp()
          THEN 1 ELSE counters.request_count + 1 END,
        window_started_at = CASE WHEN counters.window_started_at + $2 * interval '1 millisecond' <= clock_timestamp()
          THEN clock_timestamp() ELSE counters.window_started_at END
      RETURNING request_count AS count, window_started_at + $2 * interval '1 millisecond' AS reset_at
    `,
      [key, this.windowMs],
    );
    await this.cleanup();
    return rows[0];
  }

  private async cleanup(): Promise<void> {
    if (Date.now() < this.nextCleanup) return;
    this.nextCleanup = Date.now() + this.windowMs;
    await this.db.query(
      "DELETE FROM rate_limit_counters WHERE window_started_at + $1 * interval '1 millisecond' <= now()",
      [this.windowMs],
    );
  }
}
