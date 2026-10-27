import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { encryptedColumnTransformer } from '../../common/security/field-encryption';
import { AppProfile } from '../../common/enums/app-profile.enum';
import { GlobalRole } from '../../common/enums/global-role.enum';

const USER_PRIVATE_FIELDS = [
  'cpf_hash',
  'phone_hash',
  'password_hash',
  'email_verification_token',
  'password_reset_token',
  'password_reset_expires_at',
  'failed_login_attempts',
] as const;

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true, transformer: encryptedColumnTransformer })
  cpf: string | null;

  @Index('UQ_users_cpf_hash', { unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  cpf_hash: string | null;

  @Column({ type: 'varchar', nullable: true })
  password_hash: string | null;

  @Column({ type: 'varchar', nullable: true, transformer: encryptedColumnTransformer })
  phone: string | null;

  @Index('UQ_users_phone_hash', { unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  phone_hash: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  firebase_uid: string | null;

  @Column({ type: 'enum', enum: GlobalRole, default: GlobalRole.USER })
  global_role: GlobalRole;

  @Column({ type: 'enum', enum: AppProfile, nullable: true })
  app_profile: AppProfile | null;

  @Column({ type: 'boolean', default: false })
  profile_complete: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

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

  toJSON(): Partial<User> {
    const exposed: Partial<User> = { ...this };
    for (const field of USER_PRIVATE_FIELDS) delete exposed[field];
    return exposed;
  }
}
