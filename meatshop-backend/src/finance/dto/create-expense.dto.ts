import { IsIn, IsNotEmpty, IsOptional, IsString, IsNumber, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../entities/expense.entity';

export class CreateExpenseDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @Length(11, 18)
  cpfCnpj?: string;

  @IsString()
  @IsNotEmpty()
  supplierName!: string;

  @IsString()
  @IsIn(['Compras', 'Serviços', 'Outros'])
  type!: 'Compras' | 'Serviços' | 'Outros';

  // Agora o valor é um número real (não string)
  @Type(() => Number)
  @IsNumber({}, { message: 'amount deve ser um número válido' })
  amount!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'discount deve ser um número válido' })
  discount?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'paidAmount deve ser um número válido' })
  paidAmount!: number;

  @IsOptional()
  @IsString()
  postedAt?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  paidAt?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @IsIn(['Pix', 'Crédito', 'Débito', 'Dinheiro', 'Boleto'])
  paymentMethod!: PaymentMethod;
}
