import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { NotificationType } from '../../notifications/enums/notification-type.enum';
import { SendNotificationUseCase } from '../../notifications/use-cases/send-notification.use-case';
import { User } from '../../users/entities/user.entity';
import { CreateSupportTicketDto } from '../dtos/create-support-ticket.dto';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportMessage } from '../entities/support-message.entity';
import { SupportContextService } from '../services/support-context.service';
import { SupportAuditService } from '../services/support-audit.service';

@Injectable()
export class CreateSupportTicketUseCase {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly context: SupportContextService,
    private readonly sendNotification: SendNotificationUseCase,
    private readonly audit: SupportAuditService,
  ) {}

  async execute(dto: CreateSupportTicketDto, currentUser: User): Promise<SupportTicket> {
    await this.context.validate(currentUser, dto.unit_id, dto.order_id);
    const ticket = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(SupportTicket, manager.create(SupportTicket, {
        user_id: currentUser.id,
        unit_id: dto.unit_id ?? null,
        order_id: dto.order_id ?? null,
        subject: dto.subject.trim(),
        description: dto.description.trim(),
        category: dto.category,
        priority: dto.priority,
        last_message_at: new Date(),
      }));
      await manager.save(SupportMessage, manager.create(SupportMessage, {
        ticket_id: created.id, sender_id: currentUser.id, message: dto.description.trim(),
      }));
      return created;
    });
    await this.audit.record(currentUser.id, 'SUPPORT_TICKET_CREATED', ticket.id);
    await this.notifySupportTeam(ticket);
    return ticket;
  }

  private async notifySupportTeam(ticket: SupportTicket): Promise<void> {
    const admins = await this.userRepository.find({ where: { global_role: GlobalRole.SUPER_ADMIN } });
    await Promise.all(admins.map(({ id }) => this.sendNotification.execute({
      user_id: id,
      title: 'Novo chamado de suporte',
      message: `Chamado #${ticket.id}: ${ticket.subject}`,
      action_url: `/support/${ticket.id}`,
      type: NotificationType.SYSTEM,
    })));
  }
}
