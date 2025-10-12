import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn() id: number;
  @Column() cliente: string;
  @Column({ default: 'Pendente' }) status: string;
  @Column('decimal', { precision: 10, scale: 2, default: 0 }) valor: number;
  @CreateDateColumn() criadoEm: Date;
}
