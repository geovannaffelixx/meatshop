import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Unit } from '../../units/entities/unit.entity';
import { User } from '../../users/entities/user.entity';
import { SupportTicketCategory } from '../enums/support-ticket-category.enum';
import { SupportTicketPriority } from '../enums/support-ticket-priority.enum';
import { SupportTicketStatus } from '../enums/support-ticket-status.enum';
import { SupportMessage } from './support-message.entity';

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', nullable: true })
  unit_id: number | null;

  @ManyToOne(() => Unit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit | null;

  @Column({ type: 'int', nullable: true })
  order_id: number | null;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @Column({ type: 'int', nullable: true })
  assigned_to: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignee: User | null;

  @Column({ type: 'varchar', length: 150 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: SupportTicketCategory, default: SupportTicketCategory.OTHER })
  category: SupportTicketCategory;

  @Column({ type: 'enum', enum: SupportTicketPriority, default: SupportTicketPriority.NORMAL })
  priority: SupportTicketPriority;

  @Column({
    type: 'enum',
    enum: SupportTicketStatus,
    default: SupportTicketStatus.OPEN,
  })
  status: SupportTicketStatus;

  @Column({ type: 'text', nullable: true })
  response: string | null;

  @Column({ nullable: true })
  responded_by: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responded_by' })
  responded_by_user: User | null;

  @Column({ type: 'timestamp', nullable: true })
  responded_at: Date | null;

  @OneToMany(() => SupportMessage, (message) => message.ticket)
  messages: SupportMessage[];

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_message_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
