import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// 🔹 Define o ENUM dentro da própria entidade
export enum PaymentMethod {
  PIX = 'Pix',
  CREDITO = 'Crédito',
  DEBITO = 'Débito',
  DINHEIRO = 'Dinheiro',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cliente: string;

  @Column({ default: 'Pendente' })
  status: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  valor: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod: PaymentMethod;

  @CreateDateColumn()
  criadoEm: Date;
}
