import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'Nota da avaliação, de 1 a 5', example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Comentário sobre a avaliação', example: 'Carne muito fresca, chegou no prazo!' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Id do produto avaliado. Se omitido, a avaliação é sobre a unidade (açougue)',
    example: 42,
  })
  @IsOptional()
  @IsInt()
  product_id?: number;
}
