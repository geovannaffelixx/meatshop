import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AddCartItemDto {
  @IsNotEmpty()
  @IsInt()
  product_id: number;

  @IsInt()
  @Min(1)
  quantity: number;
}
