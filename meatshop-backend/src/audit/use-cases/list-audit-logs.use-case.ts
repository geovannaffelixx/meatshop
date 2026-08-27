import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { FilterAuditLogDto } from '../dtos/filter-audit-log.dto';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class ListAuditLogsUseCase {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async execute(filters: FilterAuditLogDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const [data, total] = await this.buildQuery(filters)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    };
  }

  buildQuery(filters: FilterAuditLogDto): SelectQueryBuilder<AuditLog> {
    const query = this.repository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .leftJoinAndSelect('audit.unit', 'unit')
      .select(['audit', 'user.id', 'user.name', 'unit.id', 'unit.name'])
      .orderBy('audit.created_at', 'DESC');
    this.applyExact(query, filters);
    this.applySearch(query, filters);
    return query;
  }

  private applyExact(query: SelectQueryBuilder<AuditLog>, filters: FilterAuditLogDto): void {
    const fields: Array<keyof FilterAuditLogDto> = [
      'user_id',
      'unit_id',
      'entity',
      'entity_id',
      'action',
      'outcome',
    ];
    for (const field of fields)
      if (filters[field] !== undefined)
        query.andWhere(`audit.${field} = :${field}`, {
          [field]: filters[field],
        });
    if (filters.date_from)
      query.andWhere('audit.created_at >= :dateFrom', {
        dateFrom: filters.date_from,
      });
    if (filters.date_to)
      query.andWhere('audit.created_at <= :dateTo', {
        dateTo: filters.date_to,
      });
  }

  private applySearch(query: SelectQueryBuilder<AuditLog>, filters: FilterAuditLogDto): void {
    if (!filters.search) return;
    query.andWhere(
      new Brackets((nested) =>
        nested
          .where('audit.description ILIKE :search', {
            search: `%${filters.search}%`,
          })
          .orWhere('audit.action ILIKE :search', {
            search: `%${filters.search}%`,
          })
          .orWhere('audit.entity ILIKE :search', {
            search: `%${filters.search}%`,
          })
          .orWhere('user.name ILIKE :search', { search: `%${filters.search}%` })
          .orWhere('unit.name ILIKE :search', {
            search: `%${filters.search}%`,
          }),
      ),
    );
  }
}
