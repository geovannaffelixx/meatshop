import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// 🔹 Enum dos métodos de pagamento
export enum PaymentMethod {
  PIX = 'Pix',
  CREDITO = 'Crédito',
  DEBITO = 'Débito',
  DINHEIRO = 'Dinheiro',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  cliente: string;

  // CPF/CNPJ do cliente (usado em filtros e exibição)
  @Column({ name: 'cpf_cnpj', type: 'varchar', length: 20, nullable: true })
  cpfCnpj?: string;

  @Column({ default: 'Pendente' })
  status: string;

  // Valor bruto do pedido
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  valor: number;

  // Valor de desconto aplicado
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  desconto: number;

  // Valor líquido ou pago
  @Column({ name: 'valor_pago', type: 'decimal', precision: 10, scale: 2, default: 0 })
  valorPago: number;

  // Método de pagamento
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod?: PaymentMethod;

  // Data de agendamento (opcional)
  @Column({ name: 'data_agendada', type: 'timestamp', nullable: true })
  dataAgendada?: Date;

  // Data de entrega (opcional)
  @Column({ name: 'data_entrega', type: 'timestamp', nullable: true })
  dataEntrega?: Date;

  // Observações do pedido
  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  // Data de criação
  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  // Data de última atualização
  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;
}
