import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('stock')
export class Stock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @OneToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  min_quantity: number;

  @UpdateDateColumn()
  updated_at: Date;
}
