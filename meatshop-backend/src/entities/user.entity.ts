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

  @Column({ length: 120 })
  nomeFantasia: string;

  @Column({ length: 120 })
  razaoSocial: string;

  @Column({ length: 20 })
  cnpj: string;

  @Column({ length: 20, nullable: true })
  telefone: string;

  @Column({ length: 20, nullable: true })
  celular: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ length: 10, nullable: true })
  cep: string;

  @Column({ length: 120, nullable: true })
  logradouro: string;

  @Column({ length: 10, nullable: true })
  numero: string;

  @Column({ length: 60, nullable: true })
  complemento: string;

  @Column({ length: 80, nullable: true })
  bairro: string;

  @Column({ length: 80, nullable: true })
  cidade: string;

  @Column({ length: 2, nullable: true })
  estado: string;

  @Column({ length: 80, nullable: true })
  pais: string;

  @Column({ length: 120, unique: true })
  email: string;

  @Column({ length: 50, unique: true })
  usuario: string;

  @Column()
  senhaHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
