import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportTicketAccessService } from './services/support-ticket-access.service';
import { SupportController } from './support.controller';
import { AnswerSupportTicketUseCase } from './use-cases/answer-support-ticket.use-case';
import { CloseSupportTicketUseCase } from './use-cases/close-support-ticket.use-case';
import { CreateSupportTicketUseCase } from './use-cases/create-support-ticket.use-case';
import { GetSupportTicketUseCase } from './use-cases/get-support-ticket.use-case';
import { ListSupportTicketsUseCase } from './use-cases/list-support-tickets.use-case';
import { UpdateSupportTicketUseCase } from './use-cases/update-support-ticket.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket])],
  controllers: [SupportController],
  providers: [
    SupportTicketAccessService,
    CreateSupportTicketUseCase,
    UpdateSupportTicketUseCase,
    AnswerSupportTicketUseCase,
    CloseSupportTicketUseCase,
    ListSupportTicketsUseCase,
    GetSupportTicketUseCase,
  ],
})
export class SupportModule {}
