// src/finance/dto/create-expense.dto.ts
import { IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
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

  // Aceita inteiros e decimais com ponto OU vírgula (ex.: "1800", "1800.00", "1800,00")
  @IsString()
  @Matches(/^\d+(?:[.,]\d{1,2})?$/, { message: 'amount deve ser número com até 2 casas decimais' })
  amount!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(?:[.,]\d{1,2})?$/, {
    message: 'discount deve ser número com até 2 casas decimais',
  })
  discount?: string;

  @IsString()
  @Matches(/^\d+(?:[.,]\d{1,2})?$/, {
    message: 'paidAmount deve ser número com até 2 casas decimais',
  })
  paidAmount!: string;

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
