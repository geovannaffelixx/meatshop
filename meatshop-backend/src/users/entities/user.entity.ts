import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('users')
@Unique(['email'])
@Unique(['usuario'])
@Unique(['cnpj'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nome_fantasia', type: 'varchar', length: 120 })
  nomeFantasia: string;

  @Column({ name: 'razao_social', type: 'varchar', length: 120 })
  razaoSocial: string;

  @Column({ name: 'cnpj', type: 'varchar', length: 20, unique: true })
  cnpj: string;

  @Column({ name: 'telefone', type: 'varchar', length: 20, nullable: true })
  telefone?: string;

  @Column({ name: 'celular', type: 'varchar', length: 20, nullable: true })
  celular?: string;

  @Column({ name: 'logo_url', type: 'varchar', nullable: true })
  logoUrl?: string;

  @Column({ name: 'cep', type: 'varchar', length: 10, nullable: true })
  cep?: string;

  @Column({ name: 'logradouro', type: 'varchar', length: 120, nullable: true })
  logradouro?: string;

  @Column({ name: 'numero', type: 'varchar', length: 10, nullable: true })
  numero?: string;

  @Column({ name: 'complemento', type: 'varchar', length: 60, nullable: true })
  complemento?: string;

  @Column({ name: 'bairro', type: 'varchar', length: 80, nullable: true })
  bairro?: string;

  @Column({ name: 'cidade', type: 'varchar', length: 80, nullable: true })
  cidade?: string;

  @Column({ name: 'estado', type: 'varchar', length: 2, nullable: true })
  estado?: string;

  @Column({ name: 'pais', type: 'varchar', length: 80, nullable: true })
  pais?: string;

  @Column({ name: 'email', type: 'varchar', length: 120, unique: true })
  email: string;

  @Column({ name: 'usuario', type: 'varchar', length: 50, unique: true })
  usuario: string;

  @Column({ name: 'senha_hash', type: 'varchar' })
  senhaHash: string;

  // Metadados
  @CreateDateColumn({ name: 'criado_em', type: 'timestamp' })
  criadoEm: Date;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamp' })
  atualizadoEm: Date;
}
