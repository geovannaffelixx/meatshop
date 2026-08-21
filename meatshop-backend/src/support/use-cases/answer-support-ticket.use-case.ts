import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AnswerSupportTicketDto } from '../dtos/answer-support-ticket.dto';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportTicketStatus } from '../enums/support-ticket-status.enum';

@Injectable()
export class AnswerSupportTicketUseCase {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
  ) {}

  async execute(
    ticketId: number,
    dto: AnswerSupportTicketDto,
    currentUser: User,
  ): Promise<SupportTicket> {
    const ticket = await this.supportTicketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException('A closed ticket cannot be answered');
    }

    ticket.response = dto.response;
    ticket.responded_by = currentUser.id;
    ticket.responded_at = new Date();
    ticket.status = SupportTicketStatus.ANSWERED;

    return this.supportTicketRepository.save(ticket);
  }
}
