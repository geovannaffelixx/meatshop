import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportTicketAccessService } from '../services/support-ticket-access.service';

@Injectable()
export class GetSupportTicketUseCase {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
    private readonly supportTicketAccessService: SupportTicketAccessService,
  ) {}

  async execute(ticketId: number, currentUser: User): Promise<SupportTicket> {
    const ticket = await this.supportTicketRepository.findOne({
      where: { id: ticketId },
      relations: ['user', 'unit', 'order', 'assignee', 'messages', 'messages.sender', 'messages.attachments'],
      order: { messages: { created_at: 'ASC' } },
    });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    this.supportTicketAccessService.assertCanView(ticket, currentUser);

    return ticket;
  }
}
