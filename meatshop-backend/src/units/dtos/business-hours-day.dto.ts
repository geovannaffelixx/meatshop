import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, Matches, ValidateIf } from 'class-validator';
import { Weekday } from '../enums/weekday.enum';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class BusinessHoursDayDto {
  @ApiProperty({ description: 'Dia da semana', enum: Weekday, example: Weekday.MONDAY })
  @IsEnum(Weekday)
  weekday: Weekday;

  @ApiProperty({ description: 'Indica se a unidade abre neste dia', example: true })
  @IsBoolean()
  is_open: boolean;

  @ApiPropertyOptional({
    description: 'Horário de abertura (HH:mm). Obrigatório quando is_open é true',
    example: '08:00',
  })
  @ValidateIf((dto) => dto.is_open)
  @Matches(TIME_PATTERN, { message: 'opening_time must be in HH:mm format' })
  opening_time?: string;

  @ApiPropertyOptional({
    description: 'Horário de fechamento (HH:mm). Obrigatório quando is_open é true',
    example: '18:00',
  })
  @ValidateIf((dto) => dto.is_open)
  @Matches(TIME_PATTERN, { message: 'closing_time must be in HH:mm format' })
  closing_time?: string;
}
