import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsNumber, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/expense.entity';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Unit identifier that owns the expense',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  unit_id!: number;

  @ApiPropertyOptional({ description: 'Supplier identifier', example: 'F001' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Supplier CPF or CNPJ',
    example: '12345678000199',
  })
  @IsOptional()
  @IsString()
  @Length(11, 18)
  cpfCnpj?: string;

  @ApiProperty({
    description: 'Supplier name',
    example: 'Meat Distributor Ltd.',
  })
  @IsString()
  @IsNotEmpty()
  supplierName!: string;

  @ApiProperty({
    description: 'Expense type',
    enum: ['Purchases', 'Services', 'Other'],
    example: 'Purchases',
  })
  @IsString()
  @IsIn(['Purchases', 'Services', 'Other'])
  type!: 'Purchases' | 'Services' | 'Other';

  @ApiProperty({ description: 'Total expense amount', example: 1500.5 })
  @Type(() => Number)
  @IsNumber({}, { message: 'amount must be a valid number' })
  amount!: number;

  @ApiPropertyOptional({ description: 'Applied discount amount', example: 50 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'discount must be a valid number' })
  discount?: number;

  @ApiProperty({ description: 'Amount paid', example: 1450.5 })
  @Type(() => Number)
  @IsNumber({}, { message: 'paidAmount must be a valid number' })
  paidAmount!: number;

  @ApiPropertyOptional({
    description: 'Entry date (YYYY-MM-DD)',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsString()
  postedAt?: string;

  @ApiPropertyOptional({
    description: 'Payment date (YYYY-MM-DD)',
    example: '2026-08-05',
  })
  @IsOptional()
  @IsString()
  paidAt?: string;

  @ApiPropertyOptional({
    description: 'Expense notes',
    example: 'Monthly meat purchase',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Payment method used',
    enum: ['Pix', 'Credit', 'Debit', 'Cash', 'Bank Slip'],
    example: 'Pix',
  })
  @IsString()
  @IsIn(['Pix', 'Credit', 'Debit', 'Cash', 'Bank Slip'])
  paymentMethod!: PaymentMethod;
}
