import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'New cart item quantity',
    example: 3,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;
}
