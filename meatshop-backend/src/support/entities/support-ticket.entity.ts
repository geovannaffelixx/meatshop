import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SupportTicketStatus } from '../enums/support-ticket-status.enum';

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 150 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

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

  @CreateDateColumn()
  created_at: Date;
}
