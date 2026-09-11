import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRecipeProductDto {
  @ApiProperty({
    description: 'ID of the catalog product featured in the recipe',
    example: 42,
  })
  @IsInt()
  product_id: number;

  @ApiProperty({
    description: 'Call-to-action text encouraging product purchase',
    example: 'Use our premium beef picanha for this recipe!',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  call_to_action: string;
}
