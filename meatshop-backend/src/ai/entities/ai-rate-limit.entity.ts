import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('ai_rate_limits')
export class AiRateLimit {
  @PrimaryColumn()
  user_id: number;

  @Column({ type: 'timestamptz' })
  window_started_at: Date;

  @Column({ type: 'int', default: 0 })
  request_count: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
