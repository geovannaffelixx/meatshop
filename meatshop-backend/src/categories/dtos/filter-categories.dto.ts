import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PanelListQueryDto } from '../../common/dtos/panel-list-query.dto';

export class FilterCategoriesDto extends PanelListQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) unit_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(['true', 'false']) active?: string;
}
