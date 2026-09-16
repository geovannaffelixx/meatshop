import { IsLatitude, IsLongitude, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLocationDto {
  @ApiProperty({
    description: 'Current delivery person latitude',
    example: -23.55052,
  })
  @IsLatitude()
  latitude: number;

  @ApiProperty({
    description: 'Current delivery person longitude',
    example: -46.633308,
  })
  @IsLongitude()
  longitude: number;

  @ApiProperty({
    description: 'Estimated accuracy in meters',
    required: false,
    example: 12.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  accuracy?: number;
}
