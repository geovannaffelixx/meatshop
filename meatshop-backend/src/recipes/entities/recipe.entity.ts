import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Unit } from '../../units/entities/unit.entity';

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  unit_id: number;

  @ManyToOne(() => Unit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  image_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  video_url: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tag: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'timestamp', nullable: true })
  week_start: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
