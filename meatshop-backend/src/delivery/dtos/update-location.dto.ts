import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateLocationDto {
  @ApiProperty({
    description: "Latitude atual do entregador",
    example: -23.55052,
  })
  @IsLatitude()
  latitude: number;

  @ApiProperty({
    description: "Longitude atual do entregador",
    example: -46.633308,
  })
  @IsLongitude()
  longitude: number;

  @ApiProperty({
    description: "Precisão estimada em metros",
    required: false,
    example: 12.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  accuracy?: number;
}
