import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('delivery_tracking')
export class DeliveryTracking {
  @Column({ type: 'int', nullable: true })
  delivery_person_id: number | null;

  @Column({ type: 'uuid', nullable: true })
  sample_id: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  captured_at: Date | null;

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  order_id: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'decimal', precision: 7, scale: 2, nullable: true })
  accuracy: number | null;

  @CreateDateColumn()
  created_at: Date;
}
