import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('saved_payment_methods')
export class SavedPaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 60 })
  mp_card_id: string;

  @Column({ type: 'varchar', length: 60 })
  mp_customer_id: string;

  @Column({ type: 'varchar', length: 30 })
  brand: string;

  @Column({ type: 'varchar', length: 4 })
  last_four: string;

  @Column({ type: 'varchar', length: 150 })
  holder_name: string;

  @Column({ type: 'varchar', length: 2 })
  expiration_month: string;

  @Column({ type: 'varchar', length: 4 })
  expiration_year: string;

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @CreateDateColumn()
  created_at: Date;
}
