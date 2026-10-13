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
import { AiConversationService } from './ai-conversation.service';
import { AiRateLimitService } from './ai-rate-limit.service';
import type { AiChatResponse, AiConversationResponse, AiRecipeDraftResponse } from './ai.types';
import { AiChatRequestDto } from './dtos/ai-chat-request.dto';
import { GenerateRecipeDraftDto } from './dtos/generate-recipe-draft.dto';
import { RecipeDraftFeedbackDto } from './dtos/recipe-draft-feedback.dto';

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
    const started = Date.now();
    try {
      const conversation = await this.conversations.getOrCreate(user.id, dto.conversation_id);
      const history = await this.conversations.getHistory(conversation.id);
      const upstream = await this.chatbot.chat(dto.message, history, user.id, requestId);
      await this.conversations.appendExchange(conversation.id, dto.message, upstream.response);
      const result: AiChatResponse = {
        ...upstream,
        conversation_id: conversation.id,
        expires_at: conversation.expires_at.toISOString(),
      };
      this.metrics.observeAiRequest('chat', 'success', Date.now() - started);
      await this.audit.safeRecord({
        action: 'AI_CHAT',
        entity: 'ai_conversation',
        entityId: conversation.id,
        userId: user.id,
        correlationId: requestId,
        description: 'Pergunta processada e armazenada conforme retenção de sete dias',
        newData: {
          request_id: result.request_id,
          expires_at: result.expires_at,
        },
      });
      return result;
    } catch (error) {
      this.metrics.observeAiRequest('chat', 'error', Date.now() - started);
      await this.audit.safeRecord({
        action: 'AI_CHAT',
        entity: 'ai_conversation',
        userId: user.id,
        correlationId: requestId,
        outcome: AuditOutcome.FAILURE,
        description: 'Falha ao processar pergunta no assistente',
        newData: {
          error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      });
      throw error;
    }
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
