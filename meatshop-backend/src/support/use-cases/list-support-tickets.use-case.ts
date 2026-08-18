import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { User } from '../../users/entities/user.entity';
import { SupportTicket } from '../entities/support-ticket.entity';

@Injectable()
export class ListSupportTicketsUseCase {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
  ) {}

  async execute(currentUser: User): Promise<SupportTicket[]> {
    const isSuperAdmin = currentUser.global_role === GlobalRole.SUPER_ADMIN;

    return this.supportTicketRepository.find({
      where: isSuperAdmin ? {} : { user_id: currentUser.id },
      order: { created_at: 'DESC' },
    });
  }
}
