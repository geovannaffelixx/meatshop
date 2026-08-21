import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { User } from '../../users/entities/user.entity';
import { Unit } from './unit.entity';

@Entity('user_units')
@Index(['user_id', 'unit_id'], { unique: true })
export class UserUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  unit_id: number;

  @ManyToOne(() => Unit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column({ type: 'enum', enum: LocalRole })
  local_role: LocalRole;

  @Column({
    type: 'enum',
    enum: UserUnitStatus,
    default: UserUnitStatus.ACTIVE,
  })
  status: UserUnitStatus;

  @CreateDateColumn()
  created_at: Date;
}
