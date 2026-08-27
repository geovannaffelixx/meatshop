import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Unit } from '../../units/entities/unit.entity';
import { Coupon } from './coupon.entity';

@Entity('coupon_units')
export class CouponUnit {
  @PrimaryColumn() coupon_id: number;
  @PrimaryColumn() unit_id: number;
  @ManyToOne(() => Coupon, (coupon) => coupon.allowed_units, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  @ManyToOne(() => Unit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;
}
