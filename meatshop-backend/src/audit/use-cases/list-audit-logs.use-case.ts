import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilterAuditLogDto } from '../dtos/filter-audit-log.dto';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class ListAuditLogsUseCase {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async execute(filters: FilterAuditLogDto) {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);

    const where: Record<string, unknown> = {};
    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.entity) where.entity = filters.entity;
    if (filters.action) where.action = filters.action;

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    };
  }
}
