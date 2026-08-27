import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { User } from '../../users/entities/user.entity';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportTicketAccessService } from './support-ticket-access.service';

describe('SupportTicketAccessService', () => {
  const service = new SupportTicketAccessService();
  const owner = { id: 10, global_role: GlobalRole.USER } as User;
  const outsider = { id: 11, global_role: GlobalRole.USER } as User;
  const admin = { id: 1, global_role: GlobalRole.SUPER_ADMIN } as User;
  const ticket = { id: 20, user_id: owner.id } as SupportTicket;

  it('allows the requester and a super admin to view the ticket', () => {
    expect(() => service.assertCanView(ticket, owner)).not.toThrow();
    expect(() => service.assertCanView(ticket, admin)).not.toThrow();
  });

  it('hides the ticket from unrelated users', () => {
    expect(() => service.assertCanView(ticket, outsider)).toThrow(NotFoundException);
  });

  it('allows only requester or super admin to close the ticket', () => {
    expect(() => service.assertCanClose(ticket, owner)).not.toThrow();
    expect(() => service.assertCanClose(ticket, admin)).not.toThrow();
    expect(() => service.assertCanClose(ticket, outsider)).toThrow(ForbiddenException);
  });
});
