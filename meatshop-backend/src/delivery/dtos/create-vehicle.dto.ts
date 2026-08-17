import { IsEnum, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { VehicleType } from '../enums/vehicle-type.enum';

export class CreateVehicleDto {
  @IsEnum(VehicleType)
  type: VehicleType;

  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  model: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  plate: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  color: string;

  @IsInt()
  @Min(1950)
  @Max(2100)
  year: number;
}
