import { ApiProperty } from '@nestjs/swagger';
import { Unit } from '../entities/unit.entity';

export class ManagedUnitDto {
  @ApiProperty({ description: 'Id da unit', example: 3 })
  id: number;

  @ApiProperty({ description: 'Unit name', example: 'Master Meats' })
  name: string;

  @ApiProperty({ description: 'Whether the unit accepts new orders', example: true })
  is_active: boolean;

  static fromEntity(unit: Unit): ManagedUnitDto {
    const dto = new ManagedUnitDto();
    dto.id = unit.id;
    dto.name = unit.name;
    dto.is_active = unit.is_active;
    return dto;
  }
}
