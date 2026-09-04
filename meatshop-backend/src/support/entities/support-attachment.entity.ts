import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SupportMessage } from './support-message.entity';

@Entity('support_attachments')
export class SupportAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  message_id: number;

  @ManyToOne(() => SupportMessage, (message) => message.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: SupportMessage;

  @Column({ type: 'varchar', length: 255 })
  file_url: string;

  @Column({ type: 'varchar', length: 120 })
  original_name: string;

  @Column({ type: 'varchar', length: 50 })
  mime_type: string;

  @Column({ type: 'int' })
  size_bytes: number;

  @CreateDateColumn()
  created_at: Date;
}
