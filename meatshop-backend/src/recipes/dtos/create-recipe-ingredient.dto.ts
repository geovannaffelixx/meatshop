import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRecipeIngredientDto {
  @ApiProperty({ description: 'Nome do ingrediente', example: 'Picanha bovina' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({ description: 'Quantidade do ingrediente', example: '1 kg' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  quantity: string;

  @ApiPropertyOptional({
    description: 'Dica sobre esse ingrediente',
    example: 'Prefira peças com gordura uniforme de até 1 cm.',
  })
  @IsOptional()
  @IsString()
  tip?: string;
}
