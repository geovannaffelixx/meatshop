import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ListChatMessagesDto } from './dtos/list-chat-messages.dto';
import { ListOrderChatUseCase } from './use-cases/list-order-chat.use-case';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@Controller('orders/:orderId/chat')
export class ChatController {
  constructor(private readonly listOrderChatUseCase: ListOrderChatUseCase) {}

  @ApiOperation({
    summary:
      'Lista o histórico de mensagens de um pedido em um canal (UNIT ou DELIVERY_PERSON). Novas mensagens são enviadas via WebSocket',
  })
  @ApiResponse({ status: 200, description: 'Histórico de mensagens retornado com sucesso' })
  @ApiResponse({ status: 400, description: 'Nenhum entregador atribuído ao pedido ainda' })
  @ApiResponse({ status: 403, description: 'Usuário não participa desta conversa' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Get()
  list(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query() query: ListChatMessagesDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.listOrderChatUseCase.execute(orderId, query, currentUser);
  }
}
