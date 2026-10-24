import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryColumn()
  user_id: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'boolean', default: true })
  orders_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  delivery_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  promotions_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  system_enabled: boolean;

  @UpdateDateColumn()
  updated_at: Date;
}
