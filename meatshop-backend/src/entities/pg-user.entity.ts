import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'users', synchronize: false })
export class PgUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  nome: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  cpf: string;

  @Column({ type: 'varchar', name: 'senha_hash' })
  senha_hash: string;

  @Column({ type: 'varchar', name: 'role_global', nullable: true })
  role_global: string | null;

  @Column({ type: 'boolean', name: 'ativo', default: true })
  ativo: boolean;

  @Column({ type: 'timestamp', name: 'criado_em' })
  criado_em: Date;
}
