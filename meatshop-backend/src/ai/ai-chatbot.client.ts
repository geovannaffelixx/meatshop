import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiHistoryMessage } from './ai-conversation.service';
import type { AiRecipeDraftResponse, AiUpstreamChatResponse } from './ai.types';
import { AiRateLimitException } from './ai-rate-limit.exception';

type ChatbotErrorBody = { detail?: string; response?: string };

@Injectable()
export class AiChatbotClient {
  private readonly logger = new Logger(AiChatbotClient.name);
  private readonly baseUrl: string;
  private readonly serviceKey: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('AI_CHATBOT_URL', '').replace(/\/$/, '');
    this.serviceKey = config.get<string>('AI_CHATBOT_SERVICE_KEY', '');
    this.timeoutMs = Number(config.get<string>('AI_CHATBOT_TIMEOUT_MS', '45000'));
  }

  chat(
    message: string,
    history: AiHistoryMessage[],
    userId: number,
    requestId?: string,
  ): Promise<AiUpstreamChatResponse> {
    return this.post<AiUpstreamChatResponse>(
      '/chat',
      { message, history, locale: 'pt-BR' },
      userId,
      requestId,
    );
  }

  recipeDraft(
    payload: Record<string, unknown>,
    userId: number,
    requestId?: string,
  ): Promise<AiRecipeDraftResponse> {
    return this.post<AiRecipeDraftResponse>('/recipe-drafts', payload, userId, requestId);
  }

  private async post<T>(
    path: string,
    body: unknown,
    userId: number,
    requestId?: string,
  ): Promise<T> {
    if (!this.baseUrl || !this.serviceKey) {
      this.logger.error('AI_CHATBOT_URL ou AI_CHATBOT_SERVICE_KEY não configurado');
      throw new ServiceUnavailableException({
        code: 'AI_NOT_CONFIGURED',
        message: 'Assistente indisponível no momento.',
      });
    }

    let response: Response;
    try {
      response = await globalThis.fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-service-key': this.serviceKey,
          'x-meatshop-user': String(userId),
          ...(requestId ? { 'x-request-id': requestId } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      this.logger.warn(`Chatbot sem resposta: ${error instanceof Error ? error.name : 'unknown'}`);
      throw new ServiceUnavailableException({
        code: 'AI_UPSTREAM_UNAVAILABLE',
        message: 'Assistente indisponível no momento.',
      });
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new AiRateLimitException(Math.max(1, Number(retryAfter) || 1));
    }

    const payload = (await this.readJson(response)) as T | ChatbotErrorBody;
    if (response.status === 400) {
      throw new BadRequestException({
        code: 'AI_UNSAFE_INPUT',
        message:
          (payload as ChatbotErrorBody).detail ??
          'A solicitação não pode ser processada pelo assistente.',
      });
    }
    if (!response.ok) {
      this.logger.warn(`Chatbot retornou HTTP ${response.status}`);
      throw new ServiceUnavailableException({
        code: 'AI_UPSTREAM_UNAVAILABLE',
        message:
          (payload as ChatbotErrorBody).response ??
          (payload as ChatbotErrorBody).detail ??
          'Assistente indisponível no momento.',
      });
    }
    return payload as T;
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new ServiceUnavailableException({
        code: 'AI_INVALID_RESPONSE',
        message: 'O assistente devolveu uma resposta inválida.',
      });
    }
  }
}
