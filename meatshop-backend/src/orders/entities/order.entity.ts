import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentMethod {
  PIX = 'Pix',
  CREDITO = 'Crédito',
  DEBITO = 'Débito',
  DINHEIRO = 'Dinheiro',
  BOLETO = 'Boleto',
  SALDO_MP = 'Saldo MP',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  cliente: string;

  @Column({ name: 'cpf_cnpj', type: 'varchar', length: 20, nullable: true })
  cpfCnpj?: string;

  @Column({ type: 'varchar', length: 30, default: 'Pendente' })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  desconto: number;

  @Column({
    name: 'valor_pago',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  valorPago: number;

  @Column({
    name: 'paymentMethod',
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod?: PaymentMethod;

  @Column({ name: 'data_agendada', type: 'timestamp', nullable: true })
  dataAgendada?: Date;

  @Column({ name: 'data_entrega', type: 'timestamp', nullable: true })
  dataEntrega?: Date;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;

  @Column({ name: 'mp_preference_id', type: 'varchar', length: 120, nullable: true })
  mpPreferenceId?: string;

  @Column({ name: 'mp_payment_id', type: 'varchar', length: 40, nullable: true })
  mpPaymentId?: string;

  @Column({ name: 'mp_status', type: 'varchar', length: 30, nullable: true })
  mpStatus?: string;

  @Column({ name: 'mp_status_detail', type: 'varchar', length: 60, nullable: true })
  mpStatusDetail?: string;

  @Column({ name: 'mp_last_event_at', type: 'timestamp', nullable: true })
  mpLastEventAt?: Date;

  @Column({ name: 'mp_paid_at', type: 'timestamp', nullable: true })
  mpPaidAt?: Date;
}
