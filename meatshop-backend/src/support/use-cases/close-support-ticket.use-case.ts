import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportTicketStatus } from '../enums/support-ticket-status.enum';
import { SupportTicketAccessService } from '../services/support-ticket-access.service';

@Injectable()
export class CloseSupportTicketUseCase {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
    private readonly supportTicketAccessService: SupportTicketAccessService,
  ) {}

  async execute(ticketId: number, currentUser: User): Promise<SupportTicket> {
    const ticket = await this.supportTicketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    this.supportTicketAccessService.assertCanClose(ticket, currentUser);

    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException('Ticket is already closed');
    }

    ticket.status = SupportTicketStatus.CLOSED;
    return this.supportTicketRepository.save(ticket);
  }
}
