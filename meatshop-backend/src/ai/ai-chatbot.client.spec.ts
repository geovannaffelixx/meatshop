import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { AiChatbotClient } from './ai-chatbot.client';
import type { AiRateLimitException } from './ai-rate-limit.exception';
import { AiMessageRole } from './entities/ai-message.entity';

describe('AiChatbotClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses only the server-side credential and forwards correlation metadata', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ response: 'ok', request_id: 'request-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new AiChatbotClient(
      new ConfigService({
        AI_CHATBOT_URL: 'https://chatbot.internal',
        AI_CHATBOT_SERVICE_KEY: 'server-secret',
      }),
    );

    await expect(
      client.chat('picanha', [{ role: AiMessageRole.USER, content: 'contexto' }], 42, 'request-1'),
    ).resolves.toEqual({
      response: 'ok',
      request_id: 'request-1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://chatbot.internal/chat',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-service-key': 'server-secret',
          'x-meatshop-user': '42',
          'x-request-id': 'request-1',
        }),
      }),
    );
    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(request?.body))).toEqual({
      message: 'picanha',
      history: [{ role: 'user', content: 'contexto' }],
      locale: 'pt-BR',
    });
  });

  it('preserves upstream retry-after on rate limiting', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'limit' }), {
        status: 429,
        headers: { 'retry-after': '17' },
      }),
    );
    const client = new AiChatbotClient(
      new ConfigService({
        AI_CHATBOT_URL: 'https://chatbot.internal',
        AI_CHATBOT_SERVICE_KEY: 'server-secret',
      }),
    );

    await expect(client.chat('picanha', [], 42)).rejects.toMatchObject({
      retryAfterSeconds: 17,
    } satisfies Partial<AiRateLimitException>);
  });
});
