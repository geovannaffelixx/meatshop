import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Order } from './order.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  order_id: number;

  @OneToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  method: PaymentMethod | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'timestamp', nullable: true })
  payment_date: Date | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  transaction_id: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  mp_preference_id: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  mp_status_detail: string | null;

  @Column({ type: 'timestamp', nullable: true })
  mp_last_event_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
