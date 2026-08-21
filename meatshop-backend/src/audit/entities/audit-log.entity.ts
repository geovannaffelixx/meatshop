import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 100 })
  entity: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  entity_id: string | null;

  @Column({ type: 'text', nullable: true })
  old_data: string | null;

  @Column({ type: 'text', nullable: true })
  new_data: string | null;

  @CreateDateColumn()
  created_at: Date;
}
