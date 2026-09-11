import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Unit } from '../../units/entities/unit.entity';

export type ExpenseType = 'Purchases' | 'Services' | 'Other';
export type PaymentMethod = 'Pix' | 'Credit' | 'Debit' | 'Cash' | 'Bank Slip';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  unit_id: number;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column()
  supplierName: string;

  @Column({ type: 'text' })
  type: ExpenseType;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  paidAmount: number;

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
