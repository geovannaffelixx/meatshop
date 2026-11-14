import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { GetSupportTicketUseCase } from './use-cases/get-support-ticket.use-case';
import { SupportTicketAccessService } from './services/support-ticket-access.service';
import { sanitizeSupportResponse } from './support-response.interceptor';

describe('Support privacy and history', () => {
  it('returns only public sender/assignee details, including after sending a message', () => {
    const person = {
      id: 2,
      name: 'Equipe',
      avatar_url: '/photo',
      global_role: 'SUPER_ADMIN',
      email: 'private@example.test',
      cpf: 'private-cpf',
      phone: 'private-phone',
      password_hash: 'hash',
      firebase_uid: 'identity',
    };
    const response = sanitizeSupportResponse({
      assignee: person,
      messages: [{ id: 1, sender: person }],
      sender: person,
    }) as Record<string, unknown>;
    expect(JSON.stringify(response)).not.toMatch(/private-|password_hash|firebase_uid/);
    expect(response.sender).toEqual({
      id: 2,
      name: 'Equipe',
      avatar_url: '/photo',
      global_role: 'SUPER_ADMIN',
    });
  });
  function setup() {
    const rows = Array.from({ length: 65 }, (_, i) => ({ id: i + 1, ticket_id: 1 }));
    const find = jest.fn(async (options: { where: { id?: { value: number } }; take: number }) =>
      rows
        .filter((row) => !options.where.id || row.id < options.where.id.value)
        .reverse()
        .slice(0, options.take),
    );
    const repo = {
      findOne: async () => ({ id: 1, user_id: 4 }),
      manager: { getRepository: () => ({ find }) },
    };
    return {
      service: new GetSupportTicketUseCase(repo as never, new SupportTicketAccessService()),
      find,
    };
  }
  it('loads the latest 30 messages and pages backwards without overlap', async () => {
    const { service } = setup();
    const ticket = await service.execute(1, { id: 4 } as never);
    expect(ticket.messages.map((row) => row.id)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 36),
    );
    expect(ticket.messages_next_before_id).toBe(36);
    const older = await service.messages(1, { id: 4 } as never, 36);
    expect(older.items.map((row) => row.id)).toEqual(Array.from({ length: 30 }, (_, i) => i + 6));
    const last = await service.messages(1, { id: 4 } as never, older.next_before_id!);
    expect(last.items.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
    expect(last.has_more).toBe(false);
  });
  it('rejects another account before reading any conversation messages', async () => {
    const { service, find } = setup();
    await expect(service.messages(1, { id: 5 } as never)).rejects.toBeInstanceOf(NotFoundException);
    expect(find).not.toHaveBeenCalled();
  });
});
