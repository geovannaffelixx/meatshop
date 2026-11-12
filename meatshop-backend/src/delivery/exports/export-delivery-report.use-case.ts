import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppProfile } from '../../common/enums/app-profile.enum';
import { AuditTrailService } from '../../audit/audit-trail.service';
import { AuditOutcome } from '../../audit/entities/audit-log.entity';
import { ReportFileService } from '../../exports/report-file.service';
import { User } from '../../users/entities/user.entity';
import { DeliveryPerson } from '../entities/delivery-person.entity';
import { DeliveryExportDto } from './dtos/delivery-export.dto';
import { BuildDeliveryReportService } from './build-delivery-report.service';

@Injectable()
export class ExportDeliveryReportUseCase {
  private readonly logger = new Logger(ExportDeliveryReportUseCase.name);
  constructor(
    @InjectRepository(DeliveryPerson) private readonly people: Repository<DeliveryPerson>,
    private readonly builder: BuildDeliveryReportService,
    private readonly files: ReportFileService,
    private readonly audit: AuditTrailService,
  ) {}

  async execute(filters: DeliveryExportDto, user: User) {
    try {
      const person = await this.authorize(user);
      const report = await this.builder.build(filters, user, person.id);
      const file = await this.files.create(report, filters.format, `entregador-${filters.report}`);
      await this.record(filters, user.id, AuditOutcome.SUCCESS);
      return file;
    } catch (error) {
      await this.record(filters, user.id, AuditOutcome.FAILURE);
      if (error instanceof HttpException) throw error;
      this.logger.error('Delivery report failed', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException({
        code: 'EXPORT_FAILED',
        message: 'Não foi possível preparar seu arquivo. Tente novamente em instantes.',
      });
    }
  }

  private async authorize(user: User): Promise<DeliveryPerson> {
    if (user.is_active && [AppProfile.DELIVERY, AppProfile.BOTH].includes(user.app_profile!)) {
      const person = await this.people.findOneBy({ user_id: user.id });
      if (person) return person;
    }
    throw new ForbiddenException({
      code: 'DELIVERY_EXPORT_FORBIDDEN',
      message: 'Esta exportação está disponível apenas para a conta do entregador.',
    });
  }

  private record(filters: DeliveryExportDto, userId: number, outcome: AuditOutcome) {
    return this.audit.safeRecord({
      action: 'EXPORT_DELIVERY_REPORT',
      entity: 'delivery_persons',
      userId,
      outcome,
      description: `Relatório pessoal ${filters.report} (${filters.format})`,
    });
  }
}
