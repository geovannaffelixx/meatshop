import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Unit } from '../../units/entities/unit.entity';
import { User } from '../../users/entities/user.entity';
import { CouponDiscountType } from '../enums/coupon-discount-type.enum';
import { CouponType } from '../enums/coupon-type.enum';
import { CouponRedemption } from './coupon-redemption.entity';
import { CouponUnit } from './coupon-unit.entity';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 50, unique: true }) code: string;
  @Column({ type: 'varchar', length: 120 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'enum', enum: CouponType }) type: CouponType;
  @Column({ nullable: true }) unit_id: number | null;
  @ManyToOne(() => Unit, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit | null;

  @Column({ type: 'enum', enum: CouponDiscountType }) discount_type: CouponDiscountType;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) discount_amount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) maximum_discount:
    number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) minimum_order_value: number;
  @Column({ type: 'timestamp' }) starts_at: Date;
  @Column({ type: 'timestamp' }) expires_at: Date;
  @Column({ type: 'int', nullable: true }) total_usage_limit: number | null;
  @Column({ type: 'int', nullable: true }) usage_limit_per_user: number | null;
  @Column({ type: 'int', default: 0 }) current_usage_count: number;
  @Column({ type: 'boolean', default: true }) active: boolean;
  @Column() created_by: number;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => CouponUnit, (item) => item.coupon) allowed_units: CouponUnit[];
  @OneToMany(() => CouponRedemption, (item) => item.coupon) redemptions: CouponRedemption[];
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
