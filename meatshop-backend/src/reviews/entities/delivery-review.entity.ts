import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DeliveryPerson } from '../../delivery/entities/delivery-person.entity';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

@Entity('delivery_reviews')
export class DeliveryReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  order_id: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column()
  client_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: User;

  @Column()
  delivery_person_id: number;

  @ManyToOne(() => DeliveryPerson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_person_id' })
  delivery_person: DeliveryPerson;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  created_at: Date;
}
