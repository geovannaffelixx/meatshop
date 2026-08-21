import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Weekday } from '../enums/weekday.enum';
import { Unit } from './unit.entity';

@Entity('business_hours')
@Index(['unit_id', 'weekday'], { unique: true })
export class BusinessHours {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  unit_id: number;

  @ManyToOne(() => Unit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column({ type: 'enum', enum: Weekday })
  weekday: Weekday;

  @Column({ type: 'time', nullable: true })
  opening_time: string | null;

  @Column({ type: 'time', nullable: true })
  closing_time: string | null;

  @Column({ type: 'boolean', default: true })
  is_open: boolean;
}
