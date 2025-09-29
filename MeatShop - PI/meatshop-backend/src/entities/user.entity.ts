import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 100 }) nome: string;
  @Column({ unique: true }) email: string;
  @Column({ unique: true }) usuario: string;
  @Column({ length: 18 }) cnpj: string;
  @Column() senhaHash: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
