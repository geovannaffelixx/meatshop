import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditTrailService } from '../audit/audit-trail.service';
import { AuditOutcome } from '../audit/entities/audit-log.entity';
import { UnitPermission } from '../common/enums/unit-permission.enum';
import { MetricsService } from '../metrics/metrics.service';
import { Product } from '../products/entities/product.entity';
import { UnitAuthorizationService } from '../units/services/unit-authorization.service';
import { User } from '../users/entities/user.entity';
import { AiChatbotClient } from './ai-chatbot.client';
import type { AiUpstreamStreamEvent } from './ai-chatbot-stream';
import { AiConversationService, type AiHistoryMessage } from './ai-conversation.service';
import { AiRateLimitService } from './ai-rate-limit.service';
import { redactSensitiveText } from './ai-sensitive-data';
import type {
  AiChatResponse,
  AiChatStreamEvent,
  AiChatStreamSink,
  AiConversationResponse,
  AiRecipeDraftResponse,
} from './ai.types';
import { AiChatRequestDto } from './dtos/ai-chat-request.dto';
import { GenerateRecipeDraftDto } from './dtos/generate-recipe-draft.dto';
import { RecipeDraftFeedbackDto } from './dtos/recipe-draft-feedback.dto';
import type { AiConversation } from './entities/ai-conversation.entity';

type ChatContext = {
  conversation: AiConversation;
  history: AiHistoryMessage[];
  message: string;
};

type ChatTracker = {
  operation: 'chat' | 'chat_stream';
  userId: number;
  requestId?: string;
  started: number;
};

type StreamOutcome = {
  status: 'completed' | 'empty' | 'upstream_error' | 'incomplete' | 'aborted' | 'interrupted';
  text: string;
};

const STREAM_ERROR_EVENT: AiChatStreamEvent = {
  error: 'Não consegui concluir a resposta agora. Tente novamente em alguns instantes.',
  code: 'AI_UPSTREAM_UNAVAILABLE',
};

function errorType(error: unknown): string {
  return error instanceof Error ? error.constructor.name : 'Unknown';
}

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    private readonly chatbot: AiChatbotClient,
    private readonly conversations: AiConversationService,
    private readonly authorization: UnitAuthorizationService,
    private readonly rateLimit: AiRateLimitService,
    private readonly metrics: MetricsService,
    private readonly audit: AuditTrailService,
  ) {}

  async chat(dto: AiChatRequestDto, user: User, requestId?: string): Promise<AiChatResponse> {
    await this.rateLimit.consume(user.id);
    const tracker = this.startTracking('chat', user.id, requestId);
    try {
      const context = await this.prepareChat(dto, user.id);
      const upstream = await this.chatbot.chat(
        context.message,
        context.history,
        user.id,
        requestId,
      );
      const reply = redactSensitiveText(upstream.response);
      await this.conversations.appendExchange(context.conversation.id, context.message, reply);
      await this.recordChatSuccess(tracker, context.conversation, upstream.request_id);
      return {
        ...upstream,
        response: reply,
        conversation_id: context.conversation.id,
        expires_at: context.conversation.expires_at.toISOString(),
      };
    } catch (error) {
      await this.recordChatFailure(tracker, errorType(error), 'error');
      throw error;
    }
  }

  async chatStream(
    dto: AiChatRequestDto,
    user: User,
    sink: AiChatStreamSink,
    requestId?: string,
  ): Promise<void> {
    await this.rateLimit.consume(user.id);
    const tracker = this.startTracking('chat_stream', user.id, requestId);
    let context: ChatContext;
    let events: AsyncGenerator<AiUpstreamStreamEvent>;
    try {
      context = await this.prepareChat(dto, user.id);
      events = await this.chatbot.chatStream(
        context.message,
        context.history,
        user.id,
        sink.signal,
        requestId,
      );
    } catch (error) {
      await this.recordChatFailure(tracker, errorType(error), 'error');
      throw error;
    }
    sink.open();
    await this.deliverStream(context, events, sink, tracker);
  }

  private startTracking(
    operation: ChatTracker['operation'],
    userId: number,
    requestId?: string,
  ): ChatTracker {
    return { operation, userId, requestId, started: Date.now() };
  }

  private async prepareChat(dto: AiChatRequestDto, userId: number): Promise<ChatContext> {
    const conversation = await this.conversations.getOrCreate(userId, dto.conversation_id);
    const history = await this.conversations.getHistory(conversation.id);
    return { conversation, history, message: redactSensitiveText(dto.message) };
  }

  private async deliverStream(
    context: ChatContext,
    events: AsyncGenerator<AiUpstreamStreamEvent>,
    sink: AiChatStreamSink,
    tracker: ChatTracker,
  ): Promise<void> {
    const outcome = await this.relayStream(events, sink);
    const failure =
      outcome.status === 'completed'
        ? await this.saveStreamedReply(context, outcome.text, tracker)
        : outcome.status;
    if (failure) {
      await this.recordChatFailure(tracker, failure, sink.signal.aborted ? 'aborted' : 'error');
      sink.send(STREAM_ERROR_EVENT);
    }
    sink.send({ done: true, conversation_id: context.conversation.id });
    sink.close();
  }

  private async relayStream(
    events: AsyncGenerator<AiUpstreamStreamEvent>,
    sink: AiChatStreamSink,
  ): Promise<StreamOutcome> {
    let text = '';
    try {
      for await (const event of events) {
        if (event.type === 'done') return { status: text ? 'completed' : 'empty', text };
        if (event.type === 'error') return { status: 'upstream_error', text };
        text += event.text;
        sink.send({ delta: event.text });
      }
      return { status: 'incomplete', text };
    } catch {
      return { status: sink.signal.aborted ? 'aborted' : 'interrupted', text };
    }
  }

  private async saveStreamedReply(
    context: ChatContext,
    text: string,
    tracker: ChatTracker,
  ): Promise<string | null> {
    try {
      const reply = redactSensitiveText(text);
      await this.conversations.appendExchange(context.conversation.id, context.message, reply);
      await this.recordChatSuccess(tracker, context.conversation, tracker.requestId ?? null);
      return null;
    } catch (error) {
      return errorType(error);
    }
  }

  private async recordChatSuccess(
    tracker: ChatTracker,
    conversation: AiConversation,
    upstreamRequestId: string | null,
  ): Promise<void> {
    this.metrics.observeAiRequest(tracker.operation, 'success', Date.now() - tracker.started);
    await this.audit.safeRecord({
      action: 'AI_CHAT',
      entity: 'ai_conversation',
      entityId: conversation.id,
      userId: tracker.userId,
      correlationId: tracker.requestId,
      description: 'Pergunta processada e armazenada conforme retenção de sete dias',
      newData: {
        request_id: upstreamRequestId,
        expires_at: conversation.expires_at.toISOString(),
        streamed: tracker.operation === 'chat_stream',
      },
    });
  }

  private async recordChatFailure(
    tracker: ChatTracker,
    failure: string,
    outcome: 'error' | 'aborted',
  ): Promise<void> {
    this.metrics.observeAiRequest(tracker.operation, outcome, Date.now() - tracker.started);
    await this.audit.safeRecord({
      action: 'AI_CHAT',
      entity: 'ai_conversation',
      userId: tracker.userId,
      correlationId: tracker.requestId,
      outcome: AuditOutcome.FAILURE,
      description: 'Falha ao processar pergunta no assistente',
      newData: { error_type: failure, streamed: tracker.operation === 'chat_stream' },
    });
  }

  async recipeDraft(
    dto: GenerateRecipeDraftDto,
    user: User,
    requestId?: string,
  ): Promise<AiRecipeDraftResponse> {
    await this.rateLimit.consume(user.id);
    await this.authorization.assertHasPermission(user, dto.unit_id, UnitPermission.MANAGE_PRODUCTS);
    const selectedIds = [...new Set(dto.product_ids ?? [])];
    const products = selectedIds.length
      ? await this.products.find({
          where: { id: In(selectedIds), unit_id: dto.unit_id, active: true },
          order: { name: 'ASC' },
        })
      : [];
    if (products.length !== selectedIds.length) {
      throw new BadRequestException({
        code: 'AI_INVALID_PRODUCTS',
        message: 'Um ou mais produtos não pertencem à unidade ou estão inativos.',
      });
    }

    const started = Date.now();
    try {
      const result = await this.chatbot.recipeDraft(
        {
          brief: dto.brief,
          servings: dto.servings ?? 4,
          tag: dto.tag ?? null,
          products: products.map((product) => ({
            id: product.id,
            name: product.name,
            unit_of_measure: product.unit_of_measure,
          })),
        },
        user.id,
        requestId,
      );
      const allowed = new Set(selectedIds);
      if (result.draft.products.some((product) => !allowed.has(product.product_id))) {
        throw new BadRequestException({
          code: 'AI_INVALID_DRAFT',
          message: 'A IA associou um produto não autorizado.',
        });
      }
      this.metrics.observeAiRequest('recipe_draft', 'success', Date.now() - started);
      await this.audit.safeRecord({
        action: 'AI_RECIPE_DRAFT',
        entity: 'recipe',
        userId: user.id,
        unitId: dto.unit_id,
        correlationId: requestId,
        description: 'Rascunho de receita gerado para revisão humana',
        newData: {
          request_id: result.request_id,
          product_ids: selectedIds,
          servings: dto.servings ?? 4,
        },
      });
      return result;
    } catch (error) {
      this.metrics.observeAiRequest('recipe_draft', 'error', Date.now() - started);
      await this.audit.safeRecord({
        action: 'AI_RECIPE_DRAFT',
        entity: 'recipe',
        userId: user.id,
        unitId: dto.unit_id,
        correlationId: requestId,
        outcome: AuditOutcome.FAILURE,
        description: 'Falha ao gerar rascunho de receita',
        newData: {
          error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      });
      throw error;
    }
  }

  async deleteConversation(conversationId: string, user: User): Promise<void> {
    const deleted = await this.conversations.delete(user.id, conversationId);
    await this.audit.safeRecord({
      action: 'AI_CONVERSATION_DELETE',
      entity: 'ai_conversation',
      entityId: conversationId,
      userId: user.id,
      description: deleted
        ? 'Conversa do assistente excluída pelo usuário'
        : 'Exclusão idempotente de conversa inexistente ou não pertencente ao usuário',
      newData: { deleted },
    });
  }

  getConversation(conversationId: string, user: User): Promise<AiConversationResponse> {
    return this.conversations.getForUser(user.id, conversationId);
  }

  async recordRecipeDraftFeedback(dto: RecipeDraftFeedbackDto, user: User): Promise<void> {
    await this.authorization.assertHasPermission(user, dto.unit_id, UnitPermission.MANAGE_PRODUCTS);
    await this.audit.safeRecord({
      action: `AI_DRAFT_${dto.action}`,
      entity: 'recipe',
      userId: user.id,
      unitId: dto.unit_id,
      correlationId: dto.request_id,
      description:
        dto.action === 'APPLIED'
          ? 'Rascunho de IA aplicado ao formulário para revisão'
          : 'Rascunho de IA descartado no formulário',
    });
    this.metrics.observeAiDraftFeedback(dto.action.toLowerCase());
  }
}
