import { RevokeLegalAcceptanceUseCase } from './use-cases/revoke-legal-acceptance.use-case';
import { GetLegalHistoryUseCase } from './use-cases/get-legal-history.use-case';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegalDocument } from './entities/legal-document.entity';
import { LegalAcceptance } from './entities/legal-acceptance.entity';
import { LegalRepository } from './repositories/legal.repository';
import { LegalPolicyService } from './services/legal-policy.service';
import { RecordLegalAcceptanceUseCase } from './use-cases/record-legal-acceptance.use-case';
import { LegalController } from './legal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LegalDocument, LegalAcceptance])],
  controllers: [LegalController],
  providers: [
    RevokeLegalAcceptanceUseCase,
    GetLegalHistoryUseCase,
    LegalRepository,
    LegalPolicyService,
    RecordLegalAcceptanceUseCase,
  ],
  exports: [LegalPolicyService],
})
export class LegalModule {}
