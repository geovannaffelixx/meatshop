import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class GetAuditSummaryUseCase {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async execute() {
    const row = await this.repository
      .createQueryBuilder('audit')
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE audit.outcome = 'SUCCESS')`, 'success')
      .addSelect(`COUNT(*) FILTER (WHERE audit.outcome = 'FAILURE')`, 'failure')
      .addSelect('COUNT(*) FILTER (WHERE audit.created_at >= :since)', 'last24Hours')
      .setParameter('since', new Date(Date.now() - 86400000))
      .getRawOne<Record<string, string>>();
    return Object.fromEntries(
      Object.entries(row ?? {}).map(([key, value]) => [key, Number(value)]),
    );
  }
}
