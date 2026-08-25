import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AppProfile } from '../../common/enums/app-profile.enum';
import { GlobalRole } from '../../common/enums/global-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', unique: true })
  cpf: string;

  @Column({ type: 'varchar' })
  password_hash: string;

  @Column({ type: 'enum', enum: GlobalRole, default: GlobalRole.USER })
  global_role: GlobalRole;

  @Column({ type: 'enum', enum: AppProfile, default: AppProfile.CLIENT })
  app_profile: AppProfile;

  // Flags for account security (RNE-003)
  @Column({ type: 'int', default: 0 })
  failed_login_attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  locked_until: Date | null;

  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @Column({ type: 'varchar', nullable: true })
  email_verification_token: string | null;

  @Column({ type: 'varchar', nullable: true })
  password_reset_token: string | null;

  @Column({ type: 'timestamp', nullable: true })
  password_reset_expires_at: Date | null;

  @Column({ type: 'varchar', nullable: true })
  avatar_url: string | null;

  @CreateDateColumn()
  created_at: Date;
}