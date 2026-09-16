import { Injectable } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import { AnswerSupportTicketDto } from '../dtos/answer-support-ticket.dto';
import { SendSupportMessageUseCase } from './send-support-message.use-case';

@Injectable()
export class AnswerSupportTicketUseCase {
  constructor(private readonly sendMessage: SendSupportMessageUseCase) {}

  async execute(ticketId: number, dto: AnswerSupportTicketDto, currentUser: User) {
    return this.sendMessage.execute(ticketId, dto.response, [], currentUser);
  }
}
