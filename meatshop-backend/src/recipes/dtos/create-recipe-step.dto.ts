import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateRecipeStepDto {
  @ApiProperty({ description: 'Número de ordem do passo, começando em 1', example: 1 })
  @IsInt()
  @Min(1)
  step_number: number;

  @ApiProperty({
    description: 'Descrição do passo',
    example: 'Retire a picanha da geladeira 40 minutos antes de grelhar.',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Dica extra para esse passo específico',
    example: 'Apenas sal grosso — não complique.',
  })
  @IsOptional()
  @IsString()
  tip?: string;
}
