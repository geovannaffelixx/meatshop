import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessHours } from '../entities/business-hours.entity';
import { Weekday } from '../enums/weekday.enum';

export class BusinessHoursResponseDto {
  @ApiProperty({ description: 'Business hours record ID', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Day of the week',
    enum: Weekday,
    example: Weekday.MONDAY,
  })
  weekday: Weekday;

  @ApiProperty({
    description: 'Indicates whether the unit opens on this day',
    example: true,
  })
  is_open: boolean;

  @ApiPropertyOptional({
    description: 'Opening time (HH:mm)',
    example: '08:00',
  })
  opening_time: string | null;

  @ApiPropertyOptional({
    description: 'Closing time (HH:mm)',
    example: '18:00',
  })
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
