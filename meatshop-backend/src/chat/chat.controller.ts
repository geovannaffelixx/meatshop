import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ListChatMessagesDto } from './dtos/list-chat-messages.dto';
import { ListOrderChatUseCase } from './use-cases/list-order-chat.use-case';
import { SendMessageDto } from './dtos/send-message.dto';
import { SendMessageUseCase } from './use-cases/send-message.use-case';
import { MarkChatReadUseCase } from './use-cases/mark-chat-read.use-case';
import { ChatGateway } from './chat.gateway';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@Controller('orders/:orderId/chat')
export class ChatController {
  constructor(
    private readonly listOrderChatUseCase: ListOrderChatUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly markChatReadUseCase: MarkChatReadUseCase,
    private readonly chatGateway: ChatGateway,
  ) {}

  @ApiOperation({
    summary:
      'Lista o histórico de mensagens de um pedido em um dos três canais privados disponíveis',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico de mensagens retornado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Nenhum entregador atribuído ao pedido ainda',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não participa desta conversa',
  })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Get()
  list(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query() query: ListChatMessagesDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.listOrderChatUseCase.execute(orderId, query, currentUser);
  }

  @ApiOperation({
    summary: 'Envia uma mensagem e a publica em tempo real no canal',
  })
  @ApiResponse({ status: 201, description: 'Mensagem enviada com sucesso' })
  @Post()
  async send(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: SendMessageDto,
    @CurrentUser() currentUser: User,
  ) {
    const message = await this.sendMessageUseCase.execute(orderId, dto, currentUser);
    this.chatGateway.emitMessage(message);
    return message;
  }

  @ApiOperation({
    summary: 'Marca como lidas as mensagens recebidas neste canal',
  })
  @ApiResponse({ status: 200, description: 'Leitura registrada com sucesso' })
  @Patch('read')
  async markRead(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query() query: ListChatMessagesDto,
    @CurrentUser() currentUser: User,
  ) {
    const receipt = await this.markChatReadUseCase.execute(
      orderId,
      query.participant_type,
      currentUser,
    );
    this.chatGateway.emitReadReceipt(receipt);
    return receipt;
  }
}
