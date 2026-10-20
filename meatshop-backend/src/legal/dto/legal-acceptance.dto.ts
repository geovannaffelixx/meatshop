import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class LegalAcceptanceDto {
  @ApiProperty({
    type: [Number],
    description: 'Exact document IDs explicitly presented and accepted',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  document_ids: number[];

  @ApiProperty({ enum: ['web', 'mobile'] })
  @IsIn(['web', 'mobile'])
  channel: 'web' | 'mobile';

  @ApiProperty({ example: true })
  @Transform(({ obj, key }) => obj[key])
  @Equals(true)
  accepted: true;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ obj, key }) => obj[key])
  @Equals(true)
  authorized_representative?: true;
}

export class LegalSubmissionDto {
  @ApiPropertyOptional({ type: () => LegalAcceptanceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LegalAcceptanceDto)
  legal_acceptance?: LegalAcceptanceDto;
}

export class RecordLegalAcceptanceDto extends LegalAcceptanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  unit_id?: number;
}
