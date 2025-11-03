import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { PaymentMethod } from './expense.entity';
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn() id: number;
  @Column() cliente: string;
  @Column({ default: 'Pendente' }) status: string;
  @Column('decimal', { precision: 10, scale: 2, default: 0 }) valor: number;
  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod: PaymentMethod;

  @CreateDateColumn() criadoEm: Date;
}
