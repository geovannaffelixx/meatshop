import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ON_SALE';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 255 })
  description: string;

  @Column({ length: 100 })
  @Index()
  category: string;

  @Column({ length: 100 })
  cut: string;

  @Column({ length: 100, nullable: true })
  brand?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Example: "60,00 KG", "10 UN"
  @Column({ length: 50 })
  quantity: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    name: 'promotional_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  promotionalPrice?: number | null;

  @Column({
    name: 'promotion_active',
    type: 'boolean',
    default: false,
  })
  promotionActive: boolean;

  @Column({ length: 20, default: 'ACTIVE' })
  status: ProductStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
