import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { LegalDocument } from '../entities/legal-document.entity';
import type { LegalAcceptanceDto } from '../dto/legal-acceptance.dto';

@Injectable()
export class LegalRepository {
  constructor(private readonly dataSource: DataSource) {}

  current(manager = this.dataSource.manager): Promise<LegalDocument[]> {
    const query = manager
      .createQueryBuilder(LegalDocument, 'document')
      .where('document.is_current = true')
      .orderBy('document.id', 'ASC');
    if (manager.queryRunner?.isTransactionActive) query.setLock('pessimistic_read');
    return query.getMany();
  }

  document(id: number): Promise<LegalDocument | null> {
    return this.dataSource.manager.findOneBy(LegalDocument, { id });
  }

  history(userId: number) {
    return this.dataSource.query(
      `SELECT a.*, d.kind, d.version, d.title, d.content_hash
      FROM legal_acceptances a JOIN legal_documents d ON d.id = a.document_id
      WHERE a.user_id = $1 ORDER BY a.accepted_at DESC, a.id DESC`,
      [userId],
    );
  }

  async acceptedIds(userId: number, unitId: number | null): Promise<number[]> {
    const rows: { document_id: number }[] = await this.dataSource.query(
      'SELECT document_id FROM legal_acceptances WHERE user_id = $1 AND unit_id IS NOT DISTINCT FROM $2',
      [userId, unitId],
    );
    return rows.map((row) => row.document_id);
  }

  async canRepresent(userId: number, unitId: number): Promise<boolean> {
    const rows = await this.dataSource.query(
      'SELECT id FROM units WHERE id = $1 AND admin_id = $2',
      [unitId, userId],
    );
    return rows.length > 0;
  }

  async unitAccepted(unitId: number): Promise<boolean> {
    const rows: { accepted: boolean }[] = await this.dataSource.query(
      `SELECT EXISTS (
      SELECT 1 FROM legal_documents d JOIN legal_acceptances a ON a.document_id = d.id
      JOIN units u ON u.id = a.unit_id AND u.admin_id = a.user_id
      WHERE d.is_current AND d.kind = 'ESTABLISHMENT_TERMS' AND a.unit_id = $1
    ) AS accepted`,
      [unitId],
    );
    return rows[0]?.accepted === true;
  }

  async record(
    manager: EntityManager,
    userId: number,
    dto: LegalAcceptanceDto,
    documents: LegalDocument[],
    unitId: number | null,
  ) {
    for (const document of documents) {
      const scope = document.kind === 'ESTABLISHMENT_TERMS' ? unitId : null;
      await manager.query(
        `INSERT INTO legal_acceptances
        (user_id, document_id, unit_id, channel, authorized_representative)
        VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [
          userId,
          document.id,
          scope,
          dto.channel,
          scope !== null && dto.authorized_representative === true,
        ],
      );
    }
  }

  transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }
}
