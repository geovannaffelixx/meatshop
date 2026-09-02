import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Address } from '../../users/entities/address.entity';
import { Coupon } from '../../promotions/entities/coupon.entity';
import { DeliveryPerson } from '../../delivery/entities/delivery-person.entity';
import { Unit } from '../../units/entities/unit.entity';
import { User } from '../../users/entities/user.entity';
import { CancelledBy } from '../enums/cancelled-by.enum';
import { DeliveryStatus } from '../enums/delivery-status.enum';
import { DeliveryStep } from '../enums/delivery-step.enum';
import { DeliveryType } from '../enums/delivery-type.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', nullable: true })
  checkout_id: string | null;

  @Column()
  client_id: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client: User;

  @Column()
  unit_id: number;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column({ nullable: true })
  delivery_person_id: number | null;

  @ManyToOne(() => DeliveryPerson, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'delivery_person_id' })
  delivery_person: DeliveryPerson | null;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  pickup_code_hash: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  delivery_code_hash: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  delivery_code_ciphertext: string | null;

  @Column({ type: 'timestamp', nullable: true })
  pickup_code_expires_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  delivery_code_expires_at: Date | null;

  @Column({ type: 'int', default: 0 })
  pickup_code_attempts: number;

  @Column({ type: 'int', default: 0 })
  delivery_code_attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  pickup_code_locked_until: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  delivery_code_locked_until: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  pickup_verified_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  delivery_verified_at: Date | null;

  @CreateDateColumn()
  order_date: Date;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: DeliveryStatus, nullable: true })
  delivery_status: DeliveryStatus | null;

  @Column({ type: 'enum', enum: DeliveryStep, nullable: true })
  delivery_step: DeliveryStep | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  delivery_fee: number;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date | null;

  @Column({ type: 'enum', enum: CancelledBy, nullable: true })
  cancelled_by: CancelledBy | null;

  @Column({ nullable: true })
  address_id: number | null;

  @ManyToOne(() => Address, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'address_id' })
  address: Address | null;

  @Column({ nullable: true })
  coupon_id: number | null;

  @ManyToOne(() => Coupon, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon | null;

  @Column({ type: 'timestamp', nullable: true })
  scheduled_delivery_date: Date | null;

  @Column({ type: 'boolean', default: false })
  is_scheduled: boolean;

  @Column({ type: 'enum', enum: DeliveryType, default: DeliveryType.DELIVERY })
  delivery_type: DeliveryType;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status: PaymentStatus;

  @UpdateDateColumn()
  updated_at: Date;
}
