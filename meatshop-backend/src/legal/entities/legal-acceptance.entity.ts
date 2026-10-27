import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('legal_acceptances')
export class LegalAcceptance {
  @Column({ type: 'varchar', default: 'ACCEPTED' })
  event_type: 'ACCEPTED' | 'REVOKED';

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  document_id: number;

  @Column({ type: 'int', nullable: true })
  unit_id: number | null;

  @Column()
  channel: string;

  @Column({ default: false })
  authorized_representative: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  accepted_at: Date;
}
