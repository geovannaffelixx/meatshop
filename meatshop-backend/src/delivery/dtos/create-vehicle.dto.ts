import { IsEnum, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '../enums/vehicle-type.enum';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Registered vehicle type',
    enum: VehicleType,
    example: VehicleType.MOTORCYCLE,
  })
  @IsEnum(VehicleType)
  type: VehicleType;

  @ApiProperty({
    description: 'Vehicle model',
    example: 'Honda CG 160',
    maxLength: 80,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  model: string;

  @ApiProperty({
    description: 'Vehicle license plate',
    example: 'ABC1D23',
    maxLength: 10,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  plate: string;

  @ApiProperty({
    description: 'Vehicle color',
    example: 'Preto',
    maxLength: 30,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  color: string;

  @ApiProperty({
    description: 'Vehicle manufacturing year',
    example: 2022,
    minimum: 1950,
    maximum: 2100,
  })
  @IsInt()
  @Min(1950)
  @Max(2100)
  year: number;
}
