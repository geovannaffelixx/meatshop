import { IsLatitude, IsLongitude } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLocationDto {
  @ApiProperty({
    description: 'Latitude atual do entregador',
    example: -23.55052,
  })
  @IsLatitude()
  latitude: number;

  @ApiProperty({
    description: 'Longitude atual do entregador',
    example: -46.633308,
  })
  @IsLongitude()
  longitude: number;
}
