import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DeliveryPerson } from '../delivery/entities/delivery-person.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Order } from '../orders/entities/order.entity';
import { Unit } from '../units/entities/unit.entity';
import { User } from '../users/entities/user.entity';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { Chat } from './entities/chat.entity';
import { ChatAuthorizationService } from './services/chat-authorization.service';
import { ListOrderChatUseCase } from './use-cases/list-order-chat.use-case';
import { SendMessageUseCase } from './use-cases/send-message.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Order, Unit, DeliveryPerson, User]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatAuthorizationService, SendMessageUseCase, ListOrderChatUseCase],
})
export class ChatModule {}
