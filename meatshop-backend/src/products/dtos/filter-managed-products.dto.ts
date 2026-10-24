import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PanelListQueryDto } from '../../common/dtos/panel-list-query.dto';

export class FilterManagedProductsDto extends PanelListQueryDto {
  @ApiPropertyOptional() @Type(() => Number) @IsInt() @Min(1) unit_id: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(['true', 'false']) active?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) category?: string;
}
