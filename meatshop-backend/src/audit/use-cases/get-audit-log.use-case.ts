import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class GetAuditLogUseCase {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async execute(id: number): Promise<AuditLog> {
    const log = await this.repository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .leftJoinAndSelect('audit.unit', 'unit')
      .select(['audit', 'user.id', 'user.name', 'unit.id', 'unit.name'])
      .where('audit.id = :id', { id })
      .getOne();
    if (!log)
      throw new NotFoundException({
        code: 'AUDIT_LOG_NOT_FOUND',
        message: 'Evento de auditoria não encontrado.',
      });
    return log;
  }
}
