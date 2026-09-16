import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('delivery_offer_rejections')
@Index(['delivery_person_id', 'order_id'], { unique: true })
export class DeliveryOfferRejection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  delivery_person_id: number;

  @Column()
  order_id: number;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  reasons: string[];

  @CreateDateColumn()
  created_at: Date;
}
