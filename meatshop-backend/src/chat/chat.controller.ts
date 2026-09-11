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
    summary: 'Lists an order message history in one of the three available private channels',
  })
  @ApiResponse({
    status: 200,
    description: 'Message history returned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'No delivery person has been assigned to the order yet',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not a participant in this conversation',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Get()
  list(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query() query: ListChatMessagesDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.listOrderChatUseCase.execute(orderId, query, currentUser);
  }

  @ApiOperation({
    summary: 'Sends a message and publishes it to the channel in real time',
  })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
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
    summary: 'Marks messages received in this channel as read',
  })
  @ApiResponse({
    status: 200,
    description: 'Read status recorded successfully',
  })
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
