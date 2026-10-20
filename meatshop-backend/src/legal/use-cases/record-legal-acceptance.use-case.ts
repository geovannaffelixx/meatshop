import { ForbiddenException, Injectable } from '@nestjs/common';
import type { RecordLegalAcceptanceDto } from '../dto/legal-acceptance.dto';
import { LegalRepository } from '../repositories/legal.repository';
import { LegalPolicyService } from '../services/legal-policy.service';

@Injectable()
export class RecordLegalAcceptanceUseCase {
  constructor(
    private readonly repository: LegalRepository,
    private readonly policy: LegalPolicyService,
  ) {}

  async execute(userId: number, dto: RecordLegalAcceptanceDto) {
    if (dto.unit_id && !(await this.repository.canRepresent(userId, dto.unit_id))) {
      throw new ForbiddenException('Somente o responsável da unidade pode registrar este aceite.');
    }
    await this.repository.transaction((manager) =>
      this.policy.record(manager, userId, dto, dto.unit_id ?? null),
    );
    return { message: 'Documentos registrados com sucesso.' };
  }
}
