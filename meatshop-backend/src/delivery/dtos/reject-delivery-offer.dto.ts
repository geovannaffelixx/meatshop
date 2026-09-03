import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

export class RejectDeliveryOfferDto {
  @ApiProperty({ type: [String], example: ['Distância muito longa'] })
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  reasons: string[];
}
