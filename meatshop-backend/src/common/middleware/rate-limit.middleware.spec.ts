/* global jest */
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import type { MetricsService } from '../../metrics/metrics.service';
import { RateLimitMiddleware } from './rate-limit.middleware';

describe('RateLimitMiddleware', () => {
  const request = { ip: '127.0.0.1', socket: {}, method: 'GET', path: '/products' } as Request;
  const setup = () => {
    let count = 0;
    const query = jest.fn(async (sql: string) =>
      sql.includes('INSERT') ? [{ count: ++count, reset_at: new Date(Date.now() + 60000) }] : [],
    );
    const metrics = { observeRateLimitRejection: jest.fn() };
    const middleware = new RateLimitMiddleware(
      new ConfigService({ RATE_LIMIT_MAX: '2' }),
      { query } as unknown as DataSource,
      metrics as unknown as MetricsService,
    );
    const json = jest.fn();
    const response = {
      setHeader: jest.fn(),
      status: jest.fn(() => ({ json })),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    return { middleware, query, metrics, json, response, next };
  };

  it('shares the database quota across instances and sets rejection headers and metrics', async () => {
    const state = setup();
    const second = new RateLimitMiddleware(
      new ConfigService({ RATE_LIMIT_MAX: '2' }),
      { query: state.query } as unknown as DataSource,
      state.metrics as unknown as MetricsService,
    );
    await state.middleware.use(request, state.response, state.next);
    await second.use(request, state.response, state.next);
    await state.middleware.use(request, state.response, state.next);
    expect(state.next).toHaveBeenCalledTimes(2);
    expect(state.response.status).toHaveBeenCalledWith(429);
    expect(state.response.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', 0);
    expect(state.metrics.observeRateLimitRejection).toHaveBeenCalledWith('http');
    expect(state.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' }),
    );
    expect(state.query.mock.calls[0][0]).toContain('ON CONFLICT');
  });

  it('exempts signed provider notifications and does not bypass limits on database errors', async () => {
    const state = setup();
    await state.middleware.use(
      { ...request, method: 'POST', path: '/webhooks/mercadopago' } as Request,
      state.response,
      state.next,
    );
    expect(state.query).not.toHaveBeenCalled();
    const error = new Error('database unavailable');
    state.query.mockRejectedValueOnce(error);
    await state.middleware.use(request, state.response, state.next);
    expect(state.next).toHaveBeenLastCalledWith(error);
  });
});
