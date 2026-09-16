import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateRecipeStepDto {
  @ApiProperty({
    description: 'Step sequence number, starting at 1',
    example: 1,
  })
  @IsInt()
  @Min(1)
  step_number: number;

  @ApiProperty({
    description: 'Step description',
    example: 'Retire a picanha da geladeira 40 minutos antes de grelhar.',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Extra tip for this specific step',
    example: 'Use only coarse salt - keep it simple.',
  })
  @IsOptional()
  @IsString()
  tip?: string;
}
