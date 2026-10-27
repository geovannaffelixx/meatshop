import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EntityManager } from 'typeorm';
import type { LegalAcceptanceDto } from '../dto/legal-acceptance.dto';
import { LegalRepository } from '../repositories/legal.repository';

@Injectable()
export class LegalPolicyService {
  constructor(
    private readonly repository: LegalRepository,
    private readonly config: ConfigService,
  ) {}

  get enforced(): boolean {
    return this.config.get<string>('LEGAL_ACCEPTANCE_REQUIRED', 'true') !== 'false';
  }

  async catalog(establishment = false) {
    const documents = await this.repository.current();
    this.assertCatalog(
      documents.map((document) => document.kind),
      establishment,
    );
    return {
      enforced: this.enforced,
      documents: documents.filter(
        (document) => establishment || document.kind !== 'ESTABLISHMENT_TERMS',
      ),
    };
  }

  async document(id: number) {
    const document = await this.repository.document(id);
    if (!document) throw new NotFoundException('Documento não encontrado.');
    return document;
  }

  async pending(userId: number, unitId?: number) {
    if (unitId && !(await this.repository.canRepresent(userId, unitId))) {
      throw new ForbiddenException('Somente o responsável da unidade pode registrar este aceite.');
    }
    const { documents } = await this.catalog(Boolean(unitId));
    const general = await this.repository.acceptedIds(userId, null);
    const unit = unitId ? await this.repository.acceptedIds(userId, unitId) : [];
    return {
      enforced: this.enforced,
      documents: documents.filter(
        (document) =>
          !(document.kind === 'ESTABLISHMENT_TERMS' ? unit : general).includes(document.id),
      ),
    };
  }

  async validate(
    dto: LegalAcceptanceDto | undefined,
    establishment: boolean,
    manager?: EntityManager,
  ) {
    if (!dto && !this.enforced) return [];
    if (
      !dto ||
      dto.accepted !== true ||
      (establishment && dto.authorized_representative !== true)
    ) {
      throw new BadRequestException({
        code: 'LEGAL_ACCEPTANCE_REQUIRED',
        message: 'Confirme os documentos e, para a unidade, sua autorização de representação.',
      });
    }
    const current = await this.repository.current(manager);
    this.assertCatalog(
      current.map((document) => document.kind),
      establishment,
    );
    const required = current.filter(
      (document) => establishment || document.kind !== 'ESTABLISHMENT_TERMS',
    );
    if (
      required.length !== dto.document_ids.length ||
      required.some((document) => !dto.document_ids.includes(document.id))
    ) {
      throw new ConflictException({
        code: 'LEGAL_DOCUMENTS_CHANGED',
        message: 'Os documentos foram atualizados. Consulte e confirme as versões vigentes.',
      });
    }
    return required;
  }

  async record(
    manager: EntityManager,
    userId: number,
    dto: LegalAcceptanceDto | undefined,
    unitId: number | null = null,
  ) {
    const documents = await this.validate(dto, unitId !== null, manager);
    if (dto) await this.repository.record(manager, userId, dto, documents, unitId);
  }

  async assertUser(userId: number) {
    if (!this.enforced) return;
    const state = await this.repository.accessState(userId);
    this.assertCatalog(
      state.map((document) => document.kind),
      false,
    );
    if (state.some((document) => !document.accepted)) {
      throw new ForbiddenException({
        code: 'LEGAL_ACCEPTANCE_REQUIRED',
        message: 'Leia e aceite os documentos vigentes para continuar.',
      });
    }
  }

  async assertUnit(unitId: number) {
    if (this.enforced && !(await this.repository.unitAccepted(unitId))) {
      throw new ForbiddenException({
        code: 'UNIT_LEGAL_ACCEPTANCE_REQUIRED',
        message: 'O responsável pela unidade precisa aceitar os termos do estabelecimento.',
      });
    }
  }

  private assertCatalog(kinds: string[], establishment: boolean) {
    const required = [
      'PLATFORM_TERMS',
      'PRIVACY_NOTICE',
      ...(establishment ? ['ESTABLISHMENT_TERMS'] : []),
    ];
    if (required.some((kind) => !kinds.includes(kind))) {
      throw new ConflictException({
        code: 'LEGAL_DOCUMENTS_UNAVAILABLE',
        message: 'Documentos temporariamente indisponíveis. Tente novamente.',
      });
    }
  }
}
