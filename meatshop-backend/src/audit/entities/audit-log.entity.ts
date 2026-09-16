import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Unit } from '../../units/entities/unit.entity';

export enum AuditOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ nullable: true })
  unit_id: number | null;

  @ManyToOne(() => Unit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit | null;

  @Column({ type: 'varchar', length: 20, default: 'USER' })
  actor_type: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  actor_identifier: string | null;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 100 })
  entity: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  entity_id: string | null;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'enum', enum: AuditOutcome, default: AuditOutcome.SUCCESS })
  outcome: AuditOutcome;

  @Column({ type: 'varchar', length: 10, nullable: true })
  method: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  path: string | null;

  @Column({ type: 'int', nullable: true })
  status_code: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  correlation_id: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip_address: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent: string | null;

  @Column({ type: 'text', nullable: true })
  old_data: string | null;

  @Column({ type: 'text', nullable: true })
  new_data: string | null;

  @CreateDateColumn()
  created_at: Date;
}
