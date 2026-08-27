import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { NotificationType } from '../../notifications/enums/notification-type.enum';
import { SendNotificationUseCase } from '../../notifications/use-cases/send-notification.use-case';
import { User } from '../../users/entities/user.entity';
import { SupportAttachment } from '../entities/support-attachment.entity';
import { SupportMessage } from '../entities/support-message.entity';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportTicketStatus } from '../enums/support-ticket-status.enum';
import { SupportTicketAccessService } from '../services/support-ticket-access.service';

export type SupportUpload = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class SendSupportMessageUseCase {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SupportTicket)
    private readonly tickets: Repository<SupportTicket>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly access: SupportTicketAccessService,
    private readonly sendNotification: SendNotificationUseCase,
  ) {}

  async execute(ticketId: number, text: string | undefined, files: SupportUpload[], actor: User) {
    const ticket = await this.tickets.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Chamado não encontrado');
    this.access.assertCanView(ticket, actor);
    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException('Um chamado encerrado não pode receber mensagens');
    }
    if (!text?.trim() && files.length === 0) {
      throw new BadRequestException('Informe uma mensagem ou envie ao menos uma imagem');
    }

    const message = await this.persist(ticket, text?.trim() || null, files, actor);
    await this.notifyRecipient(ticket, actor);
    return message;
  }

  private async persist(
    ticket: SupportTicket,
    text: string | null,
    files: SupportUpload[],
    actor: User,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const message = await manager.save(
        SupportMessage,
        manager.create(SupportMessage, {
          ticket_id: ticket.id,
          sender_id: actor.id,
          message: text,
        }),
      );
      message.attachments = await manager.save(
        SupportAttachment,
        files.map((file) =>
          manager.create(SupportAttachment, {
            message_id: message.id,
            file_url: `/uploads/support/${file.filename}`,
            original_name: file.originalname.slice(0, 120),
            mime_type: file.mimetype,
            size_bytes: file.size,
          }),
        ),
      );
      const isAdmin = actor.global_role === GlobalRole.SUPER_ADMIN;
      await manager.update(SupportTicket, ticket.id, {
        assigned_to: isAdmin ? actor.id : ticket.assigned_to,
        status: isAdmin ? SupportTicketStatus.WAITING_USER : SupportTicketStatus.WAITING_SUPPORT,
        last_message_at: new Date(),
      });
      message.sender = actor;
      return message;
    });
  }

  private async notifyRecipient(ticket: SupportTicket, actor: User): Promise<void> {
    const isAdmin = actor.global_role === GlobalRole.SUPER_ADMIN;
    const recipients = isAdmin
      ? [ticket.user_id]
      : (
          await this.users.find({
            where: { global_role: GlobalRole.SUPER_ADMIN },
          })
        ).map(({ id }) => id);
    await Promise.all(
      recipients.map((userId) =>
        this.sendNotification.execute({
          user_id: userId,
          unit_id: isAdmin ? (ticket.unit_id ?? undefined) : undefined,
          title: isAdmin ? 'Resposta do suporte MeatShop' : 'Nova mensagem de suporte',
          message: `Chamado #${ticket.id}: ${ticket.subject}`,
          action_url: `/support/${ticket.id}`,
          type: NotificationType.SYSTEM,
        }),
      ),
    );
  }
}
