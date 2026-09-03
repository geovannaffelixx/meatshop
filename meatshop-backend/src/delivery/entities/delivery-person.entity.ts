import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { DeliveryMode } from "../enums/delivery-mode.enum";
import { DeliveryPersonStatus } from "../enums/delivery-person-status.enum";

@Entity("delivery_persons")
export class DeliveryPerson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  user_id: number;

  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "enum", enum: DeliveryMode })
  vehicle: DeliveryMode;

  @Column({
    type: "enum",
    enum: DeliveryPersonStatus,
    default: DeliveryPersonStatus.PENDING,
  })
  status: DeliveryPersonStatus;

  @Column({ type: "decimal", precision: 3, scale: 2, nullable: true })
  average_rating: number | null;

  @Column({ type: "boolean", default: false })
  is_online: boolean;

  @Column({ type: "timestamp", nullable: true })
  availability_updated_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
