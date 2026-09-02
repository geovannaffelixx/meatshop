import { IsOptional, IsString, MinLength } from 'class-validator';

export class FirebaseExchangeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  password?: string;
}
