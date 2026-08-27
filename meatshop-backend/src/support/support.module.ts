import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportMessage } from './entities/support-message.entity';
import { SupportAttachment } from './entities/support-attachment.entity';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { UserUnit } from '../units/entities/user-unit.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupportUploadController } from './support-upload.controller';
import { SupportContextService } from './services/support-context.service';
import { SendSupportMessageUseCase } from './use-cases/send-support-message.use-case';
import { SearchSupportTicketsUseCase } from './use-cases/search-support-tickets.use-case';
import { ReopenSupportTicketUseCase } from './use-cases/reopen-support-ticket.use-case';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { SupportAuditService } from './services/support-audit.service';
import { SupportTicketAccessService } from './services/support-ticket-access.service';
import { SupportController } from './support.controller';
import { AnswerSupportTicketUseCase } from './use-cases/answer-support-ticket.use-case';
import { CloseSupportTicketUseCase } from './use-cases/close-support-ticket.use-case';
import { CreateSupportTicketUseCase } from './use-cases/create-support-ticket.use-case';
import { GetSupportTicketUseCase } from './use-cases/get-support-ticket.use-case';
import { ListSupportTicketsUseCase } from './use-cases/list-support-tickets.use-case';
import { UpdateSupportTicketUseCase } from './use-cases/update-support-ticket.use-case';

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([SupportTicket, SupportMessage, SupportAttachment, User, Order, UserUnit, AuditLog]),
  ],
  controllers: [SupportController, SupportUploadController],
  providers: [
    SupportTicketAccessService,
    CreateSupportTicketUseCase,
    UpdateSupportTicketUseCase,
    AnswerSupportTicketUseCase,
    CloseSupportTicketUseCase,
    ListSupportTicketsUseCase,
    GetSupportTicketUseCase,
    SupportContextService,
    SendSupportMessageUseCase,
    SearchSupportTicketsUseCase,
    ReopenSupportTicketUseCase,
    SupportAuditService,
  ],
})
export class SupportModule {}
