import { IsString, Matches } from 'class-validator';

export class ResolveAddressDto {
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/)
  zip_code: string;
}
