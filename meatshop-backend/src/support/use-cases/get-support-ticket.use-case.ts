import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportTicketAccessService } from '../services/support-ticket-access.service';
import { SupportMessage } from '../entities/support-message.entity';

@Injectable()
export class GetSupportTicketUseCase {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
    private readonly supportTicketAccessService: SupportTicketAccessService,
  ) {}

  async execute(ticketId: number, currentUser: User) {
    const ticket = await this.supportTicketRepository.findOne({
      where: { id: ticketId },
      relations: ['user', 'unit', 'order', 'assignee'],
    });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    this.supportTicketAccessService.assertCanView(ticket, currentUser);

    const page = await this.readMessages(ticketId);
    return Object.assign(ticket, {
      messages: page.items,
      messages_has_more: page.has_more,
      messages_next_before_id: page.next_before_id,
    });
  }

  async messages(ticketId: number, currentUser: User, beforeId?: number, limit = 30) {
    const ticket = await this.supportTicketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    this.supportTicketAccessService.assertCanView(ticket, currentUser);
    return this.readMessages(ticketId, beforeId, limit);
  }

  private async readMessages(ticketId: number, beforeId?: number, limit = 30) {
    const rows = await this.supportTicketRepository.manager.getRepository(SupportMessage).find({
      where: { ticket_id: ticketId, ...(beforeId ? { id: LessThan(beforeId) } : {}) },
      relations: { sender: true, attachments: true },
      order: { id: 'DESC' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).reverse();
    return { items, has_more: hasMore, next_before_id: hasMore ? (items[0]?.id ?? null) : null };
  }
}
