import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VehicleType } from '../enums/vehicle-type.enum';
import { DeliveryPerson } from './delivery-person.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  delivery_person_id: number;

  @ManyToOne(() => DeliveryPerson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_person_id' })
  delivery_person: DeliveryPerson;

  @Column({ type: 'enum', enum: VehicleType })
  type: VehicleType;

  @Column({ type: 'varchar', length: 80 })
  model: string;

  @Column({ type: 'varchar', length: 10 })
  plate: string;

  @Column({ type: 'varchar', length: 30 })
  color: string;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
