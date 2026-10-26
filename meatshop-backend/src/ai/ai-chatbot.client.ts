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
import { parseChatbotStream, type AiUpstreamStreamEvent } from './ai-chatbot-stream';

type ChatbotErrorBody = { detail?: string; response?: string };

const UNAVAILABLE_MESSAGE = 'Assistente indisponível no momento.';

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

  async chat(
    message: string,
    history: AiHistoryMessage[],
    userId: number,
    requestId?: string,
  ): Promise<AiUpstreamChatResponse> {
    const response = await this.send('/chat', this.chatBody(message, history), userId, requestId);
    return (await this.readPayload(response)) as AiUpstreamChatResponse;
  }

  async chatStream(
    message: string,
    history: AiHistoryMessage[],
    userId: number,
    signal: AbortSignal,
    requestId?: string,
  ): Promise<AsyncGenerator<AiUpstreamStreamEvent>> {
    const body = this.chatBody(message, history);
    const response = await this.send('/chat/stream', body, userId, requestId, signal);
    if (!response.ok) await this.readPayload(response);
    if (!response.body) throw this.invalidResponse();
    return parseChatbotStream(response.body);
  }

  async recipeDraft(
    payload: Record<string, unknown>,
    userId: number,
    requestId?: string,
  ): Promise<AiRecipeDraftResponse> {
    const response = await this.send('/recipe-drafts', payload, userId, requestId);
    return (await this.readPayload(response)) as AiRecipeDraftResponse;
  }

  private chatBody(message: string, history: AiHistoryMessage[]) {
    return { message, history, locale: 'pt-BR' };
  }

  private async send(
    path: string,
    body: unknown,
    userId: number,
    requestId?: string,
    signal?: AbortSignal,
  ): Promise<Response> {
    this.assertConfigured();
    const timeout = AbortSignal.timeout(this.timeoutMs);
    try {
      return await globalThis.fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-service-key': this.serviceKey,
          'x-meatshop-user': String(userId),
          ...(requestId ? { 'x-request-id': requestId } : {}),
        },
        body: JSON.stringify(body),
        signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
      });
    } catch (error) {
      this.logger.warn(`Chatbot sem resposta: ${error instanceof Error ? error.name : 'unknown'}`);
      throw new ServiceUnavailableException({
        code: 'AI_UPSTREAM_UNAVAILABLE',
        message: UNAVAILABLE_MESSAGE,
      });
    }
  }

  private assertConfigured(): void {
    if (this.baseUrl && this.serviceKey) return;
    this.logger.error('AI_CHATBOT_URL ou AI_CHATBOT_SERVICE_KEY não configurado');
    throw new ServiceUnavailableException({
      code: 'AI_NOT_CONFIGURED',
      message: UNAVAILABLE_MESSAGE,
    });
  }

  private async readPayload(response: Response): Promise<unknown> {
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new AiRateLimitException(Math.max(1, Number(retryAfter) || 1));
    }
    const payload = await this.readJson(response);
    this.assertSuccess(response, payload as ChatbotErrorBody);
    return payload;
  }

  private assertSuccess(response: Response, payload: ChatbotErrorBody): void {
    if (response.status === 400) {
      throw new BadRequestException({
        code: 'AI_UNSAFE_INPUT',
        message: payload.detail ?? 'A solicitação não pode ser processada pelo assistente.',
      });
    }
    if (!response.ok) {
      this.logger.warn(`Chatbot retornou HTTP ${response.status}`);
      throw new ServiceUnavailableException({
        code: 'AI_UPSTREAM_UNAVAILABLE',
        message: payload.response ?? payload.detail ?? UNAVAILABLE_MESSAGE,
      });
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw this.invalidResponse();
    }
  }

  private invalidResponse(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      code: 'AI_INVALID_RESPONSE',
      message: 'O assistente devolveu uma resposta inválida.',
    });
  }
}
