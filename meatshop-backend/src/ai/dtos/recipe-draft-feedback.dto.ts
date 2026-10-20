import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class RecipeDraftFeedbackDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  unit_id: number;

  @ApiProperty({ example: '0e6f37d6-5df0-4e1f-b68f-257611f90846' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  request_id: string;

  @ApiProperty({ enum: ['APPLIED', 'DISCARDED'] })
  @IsIn(['APPLIED', 'DISCARDED'])
  action: 'APPLIED' | 'DISCARDED';
}
