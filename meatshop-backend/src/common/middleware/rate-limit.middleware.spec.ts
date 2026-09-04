import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { RateLimitMiddleware } from './rate-limit.middleware';

describe('RateLimitMiddleware', () => {
  it('rejects requests after the configured limit', () => {
    const config = new ConfigService({ RATE_LIMIT_WINDOW_MS: '60000', RATE_LIMIT_MAX: '2' });
    const middleware = new RateLimitMiddleware(config);
    const request = { ip: '127.0.0.1', socket: {} } as Request;
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const response = { setHeader: jest.fn(), status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    middleware.use(request, response, next);
    middleware.use(request, response, next);
    middleware.use(request, response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' }));
  });

  it('keeps the client tracking map within its memory bound', () => {
    const config = new ConfigService({ RATE_LIMIT_WINDOW_MS: '60000', RATE_LIMIT_MAX: '2' });
    const middleware = new RateLimitMiddleware(config);
    const response = {
      setHeader: jest.fn(),
      status: jest.fn(() => ({ json: jest.fn() })),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    for (let index = 0; index <= 10_000; index += 1) {
      const request = { ip: `192.0.2.${index}`, socket: {} } as Request;
      middleware.use(request, response, next);
    }

    const state = middleware as unknown as {
      entries: Map<string, { count: number; resetAt: number }>;
    };
    expect(state.entries.size).toBe(10_000);
    expect(state.entries.has('192.0.2.0')).toBe(false);
  });
});
