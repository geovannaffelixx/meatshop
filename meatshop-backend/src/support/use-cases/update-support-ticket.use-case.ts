import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UpdateSupportTicketDto } from '../dtos/update-support-ticket.dto';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportTicketStatus } from '../enums/support-ticket-status.enum';
import { SupportTicketAccessService } from '../services/support-ticket-access.service';

@Injectable()
export class UpdateSupportTicketUseCase {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
    private readonly supportTicketAccessService: SupportTicketAccessService,
  ) {}

  async execute(
    ticketId: number,
    dto: UpdateSupportTicketDto,
    currentUser: User,
  ): Promise<SupportTicket> {
    const ticket = await this.supportTicketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    this.supportTicketAccessService.assertIsOwner(ticket, currentUser);

    if (ticket.status !== SupportTicketStatus.OPEN) {
      throw new BadRequestException('Only open tickets can be edited');
    }

    Object.assign(ticket, dto);
    return this.supportTicketRepository.save(ticket);
  }
}
