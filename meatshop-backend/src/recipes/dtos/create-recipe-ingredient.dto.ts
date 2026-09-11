import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRecipeIngredientDto {
  @ApiProperty({ description: 'Ingredient name', example: 'Beef picanha' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({ description: 'Ingredient quantity', example: '1 kg' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  quantity: string;

  @ApiPropertyOptional({
    description: 'Dica sobre esse ingrediente',
    example: 'Choose cuts with an even fat layer up to 1 cm thick.',
  })
  @IsOptional()
  @IsString()
  tip?: string;
}
