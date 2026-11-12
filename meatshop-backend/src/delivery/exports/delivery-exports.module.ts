import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportsModule } from '../../exports/exports.module';
import { UsersModule } from '../../users/users.module';
import { DeliveryPerson } from '../entities/delivery-person.entity';
import { BuildDeliveryReportService } from './build-delivery-report.service';
import { DeliveryExportsController } from './delivery-exports.controller';
import { ExportDeliveryReportUseCase } from './export-delivery-report.use-case';

@Module({
  imports: [ExportsModule, UsersModule, TypeOrmModule.forFeature([DeliveryPerson])],
  controllers: [DeliveryExportsController],
  providers: [BuildDeliveryReportService, ExportDeliveryReportUseCase],
})
export class DeliveryExportsModule {}
