import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CreateSupportTicketDto } from '../dtos/create-support-ticket.dto';
import { SupportTicket } from '../entities/support-ticket.entity';

@Injectable()
export class CreateSupportTicketUseCase {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
  ) {}

  async execute(dto: CreateSupportTicketDto, currentUser: User): Promise<SupportTicket> {
    const ticket = this.supportTicketRepository.create({
      user_id: currentUser.id,
      subject: dto.subject,
      description: dto.description,
    });

    return this.supportTicketRepository.save(ticket);
  }
}
