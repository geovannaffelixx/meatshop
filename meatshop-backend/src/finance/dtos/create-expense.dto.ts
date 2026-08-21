import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsNumber, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/expense.entity';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Identificador da unidade à qual a despesa pertence', example: 1 })
  @Type(() => Number)
  @IsInt()
  unit_id!: number;

  @ApiPropertyOptional({ description: 'Identificador do fornecedor', example: 'F001' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'CPF ou CNPJ do fornecedor', example: '12345678000199' })
  @IsOptional()
  @IsString()
  @Length(11, 18)
  cpfCnpj?: string;

  @ApiProperty({ description: 'Nome do fornecedor', example: 'Distribuidora de Carnes LTDA' })
  @IsString()
  @IsNotEmpty()
  supplierName!: string;

  @ApiProperty({
    description: 'Tipo da despesa',
    enum: ['Compras', 'Serviços', 'Outros'],
    example: 'Compras',
  })
  @IsString()
  @IsIn(['Compras', 'Serviços', 'Outros'])
  type!: 'Compras' | 'Serviços' | 'Outros';

  @ApiProperty({ description: 'Valor total da despesa', example: 1500.5 })
  @Type(() => Number)
  @IsNumber({}, { message: 'amount deve ser um número válido' })
  amount!: number;

  @ApiPropertyOptional({ description: 'Valor de desconto aplicado', example: 50 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'discount deve ser um número válido' })
  discount?: number;

  @ApiProperty({ description: 'Valor efetivamente pago', example: 1450.5 })
  @Type(() => Number)
  @IsNumber({}, { message: 'paidAmount deve ser um número válido' })
  paidAmount!: number;

  @ApiPropertyOptional({ description: 'Data de lançamento (YYYY-MM-DD)', example: '2026-08-01' })
  @IsOptional()
  @IsString()
  postedAt?: string;

  @ApiPropertyOptional({ description: 'Data de pagamento (YYYY-MM-DD)', example: '2026-08-05' })
  @IsOptional()
  @IsString()
  paidAt?: string;

  @ApiPropertyOptional({
    description: 'Observações sobre a despesa',
    example: 'Compra mensal de carnes',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Forma de pagamento utilizada',
    enum: ['Pix', 'Crédito', 'Débito', 'Dinheiro', 'Boleto'],
    example: 'Pix',
  })
  @IsString()
  @IsIn(['Pix', 'Crédito', 'Débito', 'Dinheiro', 'Boleto'])
  paymentMethod!: PaymentMethod;
}
