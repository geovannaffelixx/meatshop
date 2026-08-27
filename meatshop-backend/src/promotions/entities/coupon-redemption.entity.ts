import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Unit } from '../../units/entities/unit.entity';
import { User } from '../../users/entities/user.entity';
import { CouponRedemptionStatus } from '../enums/coupon-redemption-status.enum';
import { Coupon } from './coupon.entity';

@Entity('coupon_redemptions')
@Index(['order_id'], { unique: true })
@Index(['coupon_id', 'user_id', 'status'])
export class CouponRedemption {
  @PrimaryGeneratedColumn() id: number;
  @Column() coupon_id: number;
  @ManyToOne(() => Coupon, (coupon) => coupon.redemptions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  @Column() user_id: number;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column() order_id: number;
  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column() unit_id: number;
  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column({ type: 'decimal', precision: 10, scale: 2 }) discount_amount: number;
  @Column({ type: 'enum', enum: CouponRedemptionStatus, default: CouponRedemptionStatus.REDEEMED })
  status: CouponRedemptionStatus;

  @CreateDateColumn() redeemed_at: Date;
  @Column({ type: 'timestamp', nullable: true }) released_at: Date | null;
}
