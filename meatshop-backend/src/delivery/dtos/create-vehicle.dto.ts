import { IsEnum, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '../enums/vehicle-type.enum';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Tipo do veículo cadastrado',
    enum: VehicleType,
    example: VehicleType.MOTORCYCLE,
  })
  @IsEnum(VehicleType)
  type: VehicleType;

  @ApiProperty({
    description: 'Modelo do veículo',
    example: 'Honda CG 160',
    maxLength: 80,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  model: string;

  @ApiProperty({
    description: 'Placa do veículo',
    example: 'ABC1D23',
    maxLength: 10,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  plate: string;

  @ApiProperty({
    description: 'Cor do veículo',
    example: 'Preto',
    maxLength: 30,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  color: string;

  @ApiProperty({
    description: 'Ano de fabricação do veículo',
    example: 2022,
    minimum: 1950,
    maximum: 2100,
  })
  @IsInt()
  @Min(1950)
  @Max(2100)
  year: number;
}
