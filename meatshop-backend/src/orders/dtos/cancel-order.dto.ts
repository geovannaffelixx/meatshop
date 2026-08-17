import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  reason: string;
}
