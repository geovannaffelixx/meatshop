import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum DeliveryGoalPeriod {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

@Entity("delivery_goals")
@Index(["delivery_person_id", "period"], { unique: true })
export class DeliveryGoal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  delivery_person_id: number;

  @Column({ type: "enum", enum: DeliveryGoalPeriod })
  period: DeliveryGoalPeriod;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  target: number;

  @UpdateDateColumn()
  updated_at: Date;
}
