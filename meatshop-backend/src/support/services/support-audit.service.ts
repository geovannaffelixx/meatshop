import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../audit/entities/audit-log.entity';

@Injectable()
export class SupportAuditService {
  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  async record(userId: number, action: string, ticketId: number): Promise<void> {
    await this.logs.save(this.logs.create({
      user_id: userId,
      action,
      entity: 'SupportTicket',
      entity_id: String(ticketId),
      old_data: null,
      new_data: null,
    }));
  }
}
