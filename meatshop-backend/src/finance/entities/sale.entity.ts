import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountValue: number;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'starts_at', type: 'timestamp', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'ends_at', type: 'timestamp', nullable: true })
  endsAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
