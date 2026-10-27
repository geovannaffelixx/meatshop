import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PanelListQueryDto } from '../../common/dtos/panel-list-query.dto';
import { OrderStatus } from '../enums/order-status.enum';

export class FilterPanelOrdersDto extends PanelListQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) unit_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) order_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() order_from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() order_to?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduled_from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduled_to?: string;
}
