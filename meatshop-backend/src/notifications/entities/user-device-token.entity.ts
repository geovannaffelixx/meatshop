import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_device_tokens')
export class UserDeviceToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 300, unique: true })
  fcm_token: string;

  @Column({ type: 'varchar', length: 20, default: 'WEB' })
  platform: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  app_version: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  last_seen_at: Date;
}
