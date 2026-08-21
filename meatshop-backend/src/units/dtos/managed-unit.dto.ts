import { ApiProperty } from '@nestjs/swagger';
import { Unit } from '../entities/unit.entity';

export class ManagedUnitDto {
  @ApiProperty({ description: 'Id da unidade', example: 3 })
  id: number;

  @ApiProperty({ description: 'Nome da unidade', example: 'Master Carnes' })
  name: string;

  static fromEntity(unit: Unit): ManagedUnitDto {
    const dto = new ManagedUnitDto();
    dto.id = unit.id;
    dto.name = unit.name;
    return dto;
  }
}
