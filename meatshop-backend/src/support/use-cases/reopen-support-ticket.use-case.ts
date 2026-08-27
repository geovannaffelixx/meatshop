import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportTicketStatus } from '../enums/support-ticket-status.enum';
import { SupportTicketAccessService } from '../services/support-ticket-access.service';
import { SupportAuditService } from '../services/support-audit.service';

@Injectable()
export class ReopenSupportTicketUseCase {
  constructor(
    @InjectRepository(SupportTicket) private readonly tickets: Repository<SupportTicket>,
    private readonly access: SupportTicketAccessService,
    private readonly audit: SupportAuditService,
  ) {}

  async execute(id: number, actor: User): Promise<SupportTicket> {
    const ticket = await this.tickets.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Chamado não encontrado');
    this.access.assertCanView(ticket, actor);
    if (ticket.status !== SupportTicketStatus.CLOSED) {
      throw new BadRequestException('Somente chamados encerrados podem ser reabertos');
    }
    ticket.status = SupportTicketStatus.WAITING_SUPPORT;
    ticket.closed_at = null;
    ticket.last_message_at = new Date();
    const saved = await this.tickets.save(ticket);
    await this.audit.record(actor.id, 'SUPPORT_TICKET_REOPENED', ticket.id);
    return saved;
  }
}
