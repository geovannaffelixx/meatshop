import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 14, unique: true })
  cnpj: string;

  @Column({ type: 'varchar', length: 80 })
  city: string;

  @Column({ type: 'varchar', length: 10 })
  zip_code: string;

  @Column({ type: 'varchar', length: 2 })
  state: string;

  @Column()
  admin_id: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admin_id' })
  admin: User;

  @CreateDateColumn()
  created_at: Date;
}
