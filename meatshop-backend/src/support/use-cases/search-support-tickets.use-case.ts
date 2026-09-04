import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { User } from '../../users/entities/user.entity';
import { ListSupportTicketsQueryDto } from '../dtos/list-support-tickets-query.dto';
import { SupportTicket } from '../entities/support-ticket.entity';

@Injectable()
export class SearchSupportTicketsUseCase {
  constructor(
    @InjectRepository(SupportTicket) private readonly tickets: Repository<SupportTicket>,
  ) {}

  async execute(query: ListSupportTicketsQueryDto, actor: User) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const builder = this.tickets
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .leftJoinAndSelect('ticket.unit', 'unit')
      .orderBy('ticket.last_message_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (actor.global_role !== GlobalRole.SUPER_ADMIN) {
      builder.where('ticket.user_id = :userId', { userId: actor.id });
    }
    if (query.status) builder.andWhere('ticket.status = :status', { status: query.status });
    if (query.category)
      builder.andWhere('ticket.category = :category', { category: query.category });
    if (query.priority)
      builder.andWhere('ticket.priority = :priority', { priority: query.priority });
    const [data, total] = await builder.getManyAndCount();
    return { data, total, page, limit };
  }
}
