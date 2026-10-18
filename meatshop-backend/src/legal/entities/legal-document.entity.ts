import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('legal_documents')
export class LegalDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  kind: string;

  @Column()
  version: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column()
  content_hash: string;

  @Column({ type: 'timestamptz' })
  published_at: Date;

  @Column({ default: true })
  is_current: boolean;
}
