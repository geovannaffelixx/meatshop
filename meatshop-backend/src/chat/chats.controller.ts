import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ListChatsDto } from './dtos/list-chats.dto';
import { ChatInboxService } from './services/chat-inbox.service';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@Controller('chats')
export class ChatsController {
  constructor(private readonly inbox: ChatInboxService) {}

  @Get()
  @ApiOperation({
    summary: 'Lists the authenticated user authorized conversations',
  })
  list(@CurrentUser() user: User, @Query() query: ListChatsDto) {
    return this.inbox.list(user, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Returns the total number of unread messages' })
  unreadCount(@CurrentUser() user: User) {
    return this.inbox.unreadCount(user);
  }
}
