import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { User } from '../../users/entities/user.entity';
import { SupportTicket } from '../entities/support-ticket.entity';

@Injectable()
export class SupportTicketAccessService {
  assertCanView(ticket: SupportTicket, currentUser: User): void {
    const isOwner = ticket.user_id === currentUser.id;
    const isSuperAdmin = currentUser.global_role === GlobalRole.SUPER_ADMIN;

    if (!isOwner && !isSuperAdmin) {
      throw new NotFoundException('Support ticket not found');
    }
  }

  assertIsOwner(ticket: SupportTicket, currentUser: User): void {
    if (ticket.user_id !== currentUser.id) {
      throw new NotFoundException('Support ticket not found');
    }
  }

  assertCanClose(ticket: SupportTicket, currentUser: User): void {
    const isOwner = ticket.user_id === currentUser.id;
    const isSuperAdmin = currentUser.global_role === GlobalRole.SUPER_ADMIN;

    if (!isOwner && !isSuperAdmin) {
      throw new ForbiddenException(
        'Only the ticket owner or a super admin can close this ticket',
      );
    }
  }
}
