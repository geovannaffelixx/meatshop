import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  token_hash: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  user_id: number;

  @Column({ type: 'boolean', default: false })
  revoked: boolean;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;
}