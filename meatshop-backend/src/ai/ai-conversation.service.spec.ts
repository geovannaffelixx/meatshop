import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import { AiConversationService } from './ai-conversation.service';
import type { AiConversation } from './entities/ai-conversation.entity';
import type { AiMessage } from './entities/ai-message.entity';
import { AiMessageRole } from './entities/ai-message.entity';

describe('AiConversationService', () => {
  const conversationId = '11111111-1111-4111-8111-111111111111';

  function setup() {
    const conversations = {
      findOne: jest.fn<() => Promise<AiConversation | null>>(),
      create: jest.fn((value: Partial<AiConversation>) => value as AiConversation),
      save: jest.fn(async (value: AiConversation) => {
        value.id = conversationId;
        return value;
      }),
      delete: jest.fn(),
    };
    const messages = {
      find: jest.fn<() => Promise<AiMessage[]>>(),
      manager: { transaction: jest.fn() },
    };
    const service = new AiConversationService(
      new ConfigService({ AI_CONVERSATION_RETENTION_DAYS: '7' }),
      conversations as unknown as Repository<AiConversation>,
      messages as unknown as Repository<AiMessage>,
    );
    return { service, conversations, messages };
  }

  it('reuses only an active conversation owned by the authenticated user', async () => {
    const { service, conversations } = setup();
    const existing = {
      id: conversationId,
      user_id: 42,
      expires_at: new Date(Date.now() + 60_000),
    } as AiConversation;
    conversations.findOne.mockResolvedValue(existing);

    await expect(service.getOrCreate(42, conversationId)).resolves.toBe(existing);
    expect(conversations.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: conversationId, user_id: 42 }),
    });
    expect(conversations.save).not.toHaveBeenCalled();
  });

  it('creates a conversation with a fixed seven-day expiry when none is owned', async () => {
    const { service, conversations } = setup();
    conversations.findOne.mockResolvedValue(null);
    const before = Date.now() + 7 * 24 * 60 * 60 * 1000;

    const created = await service.getOrCreate(42, conversationId);

    expect(created.user_id).toBe(42);
    expect(created.expires_at.getTime()).toBeGreaterThanOrEqual(before);
    expect(created.expires_at.getTime()).toBeLessThanOrEqual(before + 1000);
  });

  it('returns chronological history only after ownership and expiry validation', async () => {
    const { service, conversations, messages } = setup();
    conversations.findOne.mockResolvedValue({
      id: conversationId,
      user_id: 42,
      expires_at: new Date('2026-10-16T12:00:00.000Z'),
    } as AiConversation);
    messages.find.mockResolvedValue([
      {
        role: AiMessageRole.ASSISTANT,
        content: 'Resposta',
        created_at: new Date('2026-10-09T12:00:01.000Z'),
      },
      {
        role: AiMessageRole.USER,
        content: 'Pergunta',
        created_at: new Date('2026-10-09T12:00:00.000Z'),
      },
    ] as AiMessage[]);

    const result = await service.getForUser(42, conversationId);

    expect(result.messages.map((message) => message.content)).toEqual(['Pergunta', 'Resposta']);
  });

  it('does not reveal missing, expired, or foreign conversations', async () => {
    const { service, conversations } = setup();
    conversations.findOne.mockResolvedValue(null);

    await expect(service.getForUser(42, conversationId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
