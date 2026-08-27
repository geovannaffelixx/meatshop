import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) unit_id: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0.01) subtotal: number;
}
