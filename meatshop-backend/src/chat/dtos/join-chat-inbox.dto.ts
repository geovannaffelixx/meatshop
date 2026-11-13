import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class JoinChatInboxDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unit_id: number;
}
