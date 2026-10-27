import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { AuditTrailService } from '../audit/audit-trail.service';
import type { MetricsService } from '../metrics/metrics.service';
import type { Product } from '../products/entities/product.entity';
import type { UnitAuthorizationService } from '../units/services/unit-authorization.service';
import type { User } from '../users/entities/user.entity';
import type { AiChatbotClient } from './ai-chatbot.client';
import type { AiUpstreamStreamEvent } from './ai-chatbot-stream';
import type { AiConversationService } from './ai-conversation.service';
import type { AiRateLimitService } from './ai-rate-limit.service';
import { AiService } from './ai.service';
import type { AiChatStreamEvent, AiChatStreamSink } from './ai.types';
import type { AiConversation } from './entities/ai-conversation.entity';

describe('AiService', () => {
  const conversation = {
    id: '11111111-1111-4111-8111-111111111111',
    expires_at: new Date('2026-11-02T12:00:00.000Z'),
  } as AiConversation;
  const user = { id: 42 } as User;
  const sensitiveMessage = 'meu nome é João Silva, e-mail joao@example.com, qual picanha?';
  const sanitizedMessage = 'meu nome é [nome removido], e-mail [e-mail removido], qual picanha?';

  async function* eventsOf(
    ...events: AiUpstreamStreamEvent[]
  ): AsyncGenerator<AiUpstreamStreamEvent> {
    for (const event of events) yield event;
  }

  async function* failingAfter(text: string): AsyncGenerator<AiUpstreamStreamEvent> {
    yield { type: 'delta', text };
    throw new Error('socket closed');
  }

  function createSink(aborted = false) {
    const abort = new AbortController();
    if (aborted) abort.abort();
    const sent: AiChatStreamEvent[] = [];
    const sink = {
      signal: abort.signal,
      open: jest.fn(),
      send: jest.fn((event: AiChatStreamEvent) => sent.push(event)),
      close: jest.fn(),
    } satisfies AiChatStreamSink;
    return { sink, sent };
  }

  function setup() {
    const chatbot = { chat: jest.fn(), chatStream: jest.fn() };
    const conversations = {
      getOrCreate: jest.fn(async () => conversation),
      getHistory: jest.fn(async () => []),
      appendExchange: jest.fn(async () => undefined),
    };
    const rateLimit = { consume: jest.fn(async () => undefined) };
    const metrics = { observeAiRequest: jest.fn() };
    const audit = { safeRecord: jest.fn(async () => undefined) };
    const service = new AiService(
      {} as Repository<Product>,
      chatbot as unknown as AiChatbotClient,
      conversations as unknown as AiConversationService,
      {} as UnitAuthorizationService,
      rateLimit as unknown as AiRateLimitService,
      metrics as unknown as MetricsService,
      audit as unknown as AuditTrailService,
    );
    return { service, chatbot, conversations, rateLimit, metrics, audit };
  }

  it('sends and persists only the sanitized user message', async () => {
    const { service, chatbot, conversations } = setup();
    chatbot.chat.mockResolvedValue({ response: 'Use sal grosso.', request_id: 'r-1' } as never);

    const result = await service.chat({ message: sensitiveMessage }, user, 'corr-1');

    expect(chatbot.chat).toHaveBeenCalledWith(sanitizedMessage, [], 42, 'corr-1');
    expect(conversations.appendExchange).toHaveBeenCalledWith(
      conversation.id,
      sanitizedMessage,
      'Use sal grosso.',
    );
    expect(result).toMatchObject({ response: 'Use sal grosso.', conversation_id: conversation.id });
  });

  it('relays stream deltas and persists both messages after completion', async () => {
    const { service, chatbot, conversations, rateLimit, metrics, audit } = setup();
    chatbot.chatStream.mockResolvedValue(
      eventsOf(
        { type: 'delta', text: 'Use ' },
        { type: 'delta', text: 'sal.' },
        { type: 'done' },
      ) as never,
    );
    const { sink, sent } = createSink();

    await service.chatStream({ message: sensitiveMessage }, user, sink, 'corr-1');

    expect(rateLimit.consume).toHaveBeenCalledWith(42);
    expect(chatbot.chatStream).toHaveBeenCalledWith(
      sanitizedMessage,
      [],
      42,
      sink.signal,
      'corr-1',
    );
    expect(sink.open).toHaveBeenCalled();
    expect(sent).toEqual([
      { delta: 'Use ' },
      { delta: 'sal.' },
      { done: true, conversation_id: conversation.id },
    ]);
    expect(conversations.appendExchange).toHaveBeenCalledWith(
      conversation.id,
      sanitizedMessage,
      'Use sal.',
    );
    expect(metrics.observeAiRequest).toHaveBeenCalledWith(
      'chat_stream',
      'success',
      expect.any(Number),
    );
    expect(audit.safeRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'AI_CHAT', userId: 42 }),
    );
    expect(sink.close).toHaveBeenCalled();
  });

  it('emits an error event and does not persist when the upstream fails mid-stream', async () => {
    const { service, chatbot, conversations, metrics } = setup();
    chatbot.chatStream.mockResolvedValue(failingAfter('Use ') as never);
    const { sink, sent } = createSink();

    await service.chatStream({ message: 'picanha?' }, user, sink);

    expect(sent).toEqual([
      { delta: 'Use ' },
      expect.objectContaining({ code: 'AI_UPSTREAM_UNAVAILABLE', error: expect.any(String) }),
      { done: true, conversation_id: conversation.id },
    ]);
    expect(conversations.appendExchange).not.toHaveBeenCalled();
    expect(metrics.observeAiRequest).toHaveBeenCalledWith(
      'chat_stream',
      'error',
      expect.any(Number),
    );
  });

  it('reports upstream error events without persisting', async () => {
    const { service, chatbot, conversations } = setup();
    chatbot.chatStream.mockResolvedValue(
      eventsOf({ type: 'error', message: 'falhou' }, { type: 'done' }) as never,
    );
    const { sink, sent } = createSink();

    await service.chatStream({ message: 'picanha?' }, user, sink);

    expect(sent[0]).toMatchObject({ code: 'AI_UPSTREAM_UNAVAILABLE' });
    expect(conversations.appendExchange).not.toHaveBeenCalled();
  });

  it('records an aborted request when the client disconnects', async () => {
    const { service, chatbot, conversations, metrics } = setup();
    chatbot.chatStream.mockResolvedValue(failingAfter('Use ') as never);
    const { sink } = createSink(true);

    await service.chatStream({ message: 'picanha?' }, user, sink);

    expect(conversations.appendExchange).not.toHaveBeenCalled();
    expect(metrics.observeAiRequest).toHaveBeenCalledWith(
      'chat_stream',
      'aborted',
      expect.any(Number),
    );
  });

  it('propagates failures before the stream opens as regular HTTP errors', async () => {
    const { service, chatbot, audit } = setup();
    chatbot.chatStream.mockRejectedValue(new ServiceUnavailableException() as never);
    const { sink } = createSink();

    await expect(service.chatStream({ message: 'picanha?' }, user, sink)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(sink.open).not.toHaveBeenCalled();
    expect(audit.safeRecord).toHaveBeenCalledWith(
      expect.objectContaining({ newData: expect.objectContaining({ streamed: true }) }),
    );
  });
});
