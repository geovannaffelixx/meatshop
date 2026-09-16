import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DeliveryPerson } from '../delivery/entities/delivery-person.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Order } from '../orders/entities/order.entity';
import { Unit } from '../units/entities/unit.entity';
import { User } from '../users/entities/user.entity';
import { UserUnit } from '../units/entities/user-unit.entity';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatsController } from './chats.controller';
import { ChatInboxService } from './services/chat-inbox.service';
import { Chat } from './entities/chat.entity';
import { ChatAuthorizationService } from './services/chat-authorization.service';
import { ListOrderChatUseCase } from './use-cases/list-order-chat.use-case';
import { SendMessageUseCase } from './use-cases/send-message.use-case';
import { MarkChatReadUseCase } from './use-cases/mark-chat-read.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Order, Unit, UserUnit, DeliveryPerson, User]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [ChatController, ChatsController],
  providers: [
    ChatGateway,
    ChatInboxService,
    ChatAuthorizationService,
    SendMessageUseCase,
    ListOrderChatUseCase,
    MarkChatReadUseCase,
  ],
})
export class ChatModule {}
