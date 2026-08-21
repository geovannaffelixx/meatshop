import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessHours } from '../entities/business-hours.entity';
import { Weekday } from '../enums/weekday.enum';

export class BusinessHoursResponseDto {
  @ApiProperty({ description: 'Id do registro de horário', example: 1 })
  id: number;

  @ApiProperty({ description: 'Dia da semana', enum: Weekday, example: Weekday.MONDAY })
  weekday: Weekday;

  @ApiProperty({ description: 'Indica se a unidade abre neste dia', example: true })
  is_open: boolean;

  @ApiPropertyOptional({ description: 'Horário de abertura (HH:mm)', example: '08:00' })
  opening_time: string | null;

  @ApiPropertyOptional({ description: 'Horário de fechamento (HH:mm)', example: '18:00' })
  closing_time: string | null;

  static fromEntity(entity: BusinessHours): BusinessHoursResponseDto {
    const dto = new BusinessHoursResponseDto();
    dto.id = entity.id;
    dto.weekday = entity.weekday;
    dto.is_open = entity.is_open;
    dto.opening_time = entity.opening_time;
    dto.closing_time = entity.closing_time;
    return dto;
  }

  static fromEntities(entities: BusinessHours[]): BusinessHoursResponseDto[] {
    return entities.map((entity) => BusinessHoursResponseDto.fromEntity(entity));
  }
}
