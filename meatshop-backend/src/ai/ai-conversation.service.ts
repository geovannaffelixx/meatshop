import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { readPositiveInteger } from '../config/runtime-config';
import { AiConversation } from './entities/ai-conversation.entity';
import { AiMessage, AiMessageRole } from './entities/ai-message.entity';
import type { AiConversationResponse } from './ai.types';

export type AiHistoryMessage = {
  role: AiMessageRole;
  content: string;
};

@Injectable()
export class AiConversationService {
  private readonly retentionMs: number;
  private readonly maxHistoryMessages: number;
  private readonly maxHistoryCharacters: number;

  constructor(
    config: ConfigService,
    @InjectRepository(AiConversation)
    private readonly conversations: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private readonly messages: Repository<AiMessage>,
  ) {
    const environment = {
      AI_CONVERSATION_RETENTION_DAYS: config.get<string>('AI_CONVERSATION_RETENTION_DAYS'),
      AI_HISTORY_MAX_MESSAGES: config.get<string>('AI_HISTORY_MAX_MESSAGES'),
      AI_HISTORY_MAX_CHARACTERS: config.get<string>('AI_HISTORY_MAX_CHARACTERS'),
    };
    const retentionDays = readPositiveInteger(environment, 'AI_CONVERSATION_RETENTION_DAYS', 7);
    this.retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    this.maxHistoryMessages = readPositiveInteger(environment, 'AI_HISTORY_MAX_MESSAGES', 6);
    this.maxHistoryCharacters = readPositiveInteger(environment, 'AI_HISTORY_MAX_CHARACTERS', 6000);
  }

  async getOrCreate(userId: number, conversationId?: string): Promise<AiConversation> {
    if (conversationId) {
      const existing = await this.conversations.findOne({
        where: {
          id: conversationId,
          user_id: userId,
          expires_at: MoreThan(new Date()),
        },
      });
      if (existing) return existing;
    }

    const now = Date.now();
    return this.conversations.save(
      this.conversations.create({
        user_id: userId,
        expires_at: new Date(now + this.retentionMs),
      }),
    );
  }

  async getHistory(conversationId: string): Promise<AiHistoryMessage[]> {
    const recent = await this.messages.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'DESC', id: 'DESC' },
      take: this.maxHistoryMessages,
    });

    const selected: AiMessage[] = [];
    let characters = 0;
    for (const message of recent) {
      if (characters + message.content.length > this.maxHistoryCharacters) break;
      selected.push(message);
      characters += message.content.length;
    }
    return selected.reverse().map(({ role, content }) => ({ role, content }));
  }

  async appendExchange(
    conversationId: string,
    userMessage: string,
    assistantMessage: string,
  ): Promise<void> {
    await this.messages.manager.transaction(async (manager) => {
      await manager.save(AiMessage, [
        manager.create(AiMessage, {
          conversation_id: conversationId,
          role: AiMessageRole.USER,
          content: userMessage,
        }),
        manager.create(AiMessage, {
          conversation_id: conversationId,
          role: AiMessageRole.ASSISTANT,
          content: assistantMessage,
        }),
      ]);
    });
  }

  async getForUser(userId: number, conversationId: string): Promise<AiConversationResponse> {
    const conversation = await this.conversations.findOne({
      where: {
        id: conversationId,
        user_id: userId,
        expires_at: MoreThan(new Date()),
      },
    });
    if (!conversation) {
      throw new NotFoundException({
        code: 'AI_CONVERSATION_NOT_FOUND',
        message: 'Conversa não encontrada ou expirada.',
      });
    }

    const recent = await this.messages.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'DESC', id: 'DESC' },
      take: 100,
    });
    return {
      conversation_id: conversation.id,
      expires_at: conversation.expires_at.toISOString(),
      messages: recent.reverse().map((message) => ({
        role: message.role,
        content: message.content,
        created_at: message.created_at.toISOString(),
      })),
    };
  }

  async delete(userId: number, conversationId: string): Promise<boolean> {
    const result = await this.conversations.delete({
      id: conversationId,
      user_id: userId,
    });
    return (result.affected ?? 0) > 0;
  }
}
