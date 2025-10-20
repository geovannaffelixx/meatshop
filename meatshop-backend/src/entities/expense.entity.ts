import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ExpenseType = 'Compras' | 'Serviços' | 'Outros';
export type PaymentMethod = 'Pix' | 'Crédito' | 'Débito' | 'Dinheiro' | 'Boleto';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  supplierName: string;

  @Column({ type: 'text' })
  type: ExpenseType;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  paidAmount: number;

  // YYYY-MM-DD (opcionais)
  @Column({ type: 'text', nullable: true })
  postedAt?: string | null;

  @Index()
  @Column({ type: 'text', nullable: true })
  paidAt?: string | null;

  @Column({ type: 'text' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'text', nullable: true })
  cpfCnpj?: string | null;

  @Column({ type: 'text', nullable: true })
  supplierId?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
