import type { EntityManager } from 'typeorm';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditTrailService } from '../../audit/audit-trail.service';
import { LegalRepository } from '../repositories/legal.repository';

@Injectable()
export class RevokeLegalAcceptanceUseCase {
  constructor(
    private readonly repository: LegalRepository,
    private readonly audit: AuditTrailService,
  ) {}

  async execute(userId: number, acceptanceId: number) {
    const event = await this.repository.transaction((manager) =>
      this.appendRevocation(manager, userId, acceptanceId),
    );
    await this.audit.safeRecord({
      action: 'LEGAL_CONSENT_REVOKED',
      entity: 'legal_acceptances',
      entityId: String(event.id),
      userId,
      actorType: 'USER',
      newData: { document_id: event.document_id },
    });
    return event;
  }

  private async appendRevocation(manager: EntityManager, userId: number, acceptanceId: number) {
    await manager.query('SELECT pg_advisory_xact_lock($1)', [userId]);
    const [acceptance] = await manager.query(
      `SELECT a.*,d.is_revocable FROM legal_acceptances a
        JOIN legal_documents d ON d.id=a.document_id WHERE a.id=$1 AND a.user_id=$2`,
      [acceptanceId, userId],
    );
    if (!acceptance) throw new NotFoundException('Acceptance not found');
    if (!acceptance.is_revocable)
      throw new BadRequestException({
        code: 'LEGAL_DOCUMENT_NOT_REVOCABLE',
        message: 'This document is an acknowledgement and cannot be revoked.',
      });
    const [latest] = await manager.query(
      `SELECT * FROM legal_acceptances WHERE user_id=$1 AND document_id=$2
        AND unit_id IS NOT DISTINCT FROM $3 ORDER BY id DESC LIMIT 1`,
      [userId, acceptance.document_id, acceptance.unit_id],
    );
    if (latest.event_type === 'REVOKED') return latest;
    const [created] = await manager.query(
      `INSERT INTO legal_acceptances(user_id,document_id,unit_id,channel,authorized_representative,event_type)
        VALUES ($1,$2,$3,$4,$5,'REVOKED') RETURNING *`,
      [
        userId,
        acceptance.document_id,
        acceptance.unit_id,
        acceptance.channel,
        acceptance.authorized_representative,
      ],
    );
    return created;
  }
}
