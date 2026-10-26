import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AiService } from './ai.service';
import { AiRateLimitFilter } from './ai-rate-limit.filter';
import { createSseSink } from './ai-sse.sink';
import { AiChatRequestDto } from './dtos/ai-chat-request.dto';
import { GenerateRecipeDraftDto } from './dtos/generate-recipe-draft.dto';
import { RecipeDraftFeedbackDto } from './dtos/recipe-draft-feedback.dto';

type RequestWithCorrelation = Request & { correlationId?: string };

@ApiTags('AI')
@ApiBearerAuth('access-token')
@Controller('ai')
@UseFilters(AiRateLimitFilter)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Envia uma pergunta autenticada ao assistente culinário',
  })
  @ApiResponse({ status: 201, description: 'Resposta gerada' })
  chat(
    @Body() dto: AiChatRequestDto,
    @CurrentUser() user: User,
    @Req() request: RequestWithCorrelation,
  ) {
    return this.ai.chat(dto, user, request.correlationId);
  }

  @Post('chat/stream')
  @ApiOperation({
    summary: 'Envia uma pergunta autenticada e recebe a resposta em pedaços via SSE',
  })
  @ApiProduces('text/event-stream')
  @ApiResponse({
    status: 200,
    description:
      'Eventos data: {"delta"} (n vezes), {"error","code"} em falha e {"done":true,"conversation_id"} ao final',
  })
  @ApiResponse({ status: 429, description: 'Limite de perguntas excedido' })
  chatStream(
    @Body() dto: AiChatRequestDto,
    @CurrentUser() user: User,
    @Req() request: RequestWithCorrelation,
    @Res() response: Response,
  ): Promise<void> {
    return this.ai.chatStream(dto, user, createSseSink(response), request.correlationId);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui uma conversa do assistente do usuário autenticado',
  })
  @ApiResponse({
    status: 204,
    description: 'Conversa excluída ou já inexistente',
  })
  deleteConversation(
    @Param('id', new ParseUUIDPipe({ version: '4' })) conversationId: string,
    @CurrentUser() user: User,
  ) {
    return this.ai.deleteConversation(conversationId, user);
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Recupera o histórico ativo do usuário autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Até as 100 mensagens mais recentes',
  })
  getConversation(
    @Param('id', new ParseUUIDPipe({ version: '4' })) conversationId: string,
    @CurrentUser() user: User,
  ) {
    return this.ai.getConversation(conversationId, user);
  }

  @Post('recipe-drafts')
  @ApiOperation({ summary: 'Gera rascunho estruturado para revisão no painel' })
  @ApiResponse({
    status: 201,
    description: 'Rascunho gerado sem salvar ou publicar',
  })
  recipeDraft(
    @Body() dto: GenerateRecipeDraftDto,
    @CurrentUser() user: User,
    @Req() request: RequestWithCorrelation,
  ) {
    return this.ai.recipeDraft(dto, user, request.correlationId);
  }

  @Post('recipe-drafts/feedback')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Registra se um rascunho foi aplicado ou descartado',
  })
  @ApiResponse({
    status: 204,
    description: 'Feedback registrado sem conteúdo da receita',
  })
  recordRecipeDraftFeedback(@Body() dto: RecipeDraftFeedbackDto, @CurrentUser() user: User) {
    return this.ai.recordRecipeDraftFeedback(dto, user);
  }
}
