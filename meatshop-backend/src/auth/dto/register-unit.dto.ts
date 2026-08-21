import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { RegisterUnitDetailsDto } from './register-unit-details.dto';
import { RegisterUnitOwnerDto } from './register-unit-owner.dto';

export class RegisterUnitDto {
  @ApiProperty({ type: () => RegisterUnitOwnerDto })
  @ValidateNested()
  @Type(() => RegisterUnitOwnerDto)
  owner: RegisterUnitOwnerDto;

  @ApiProperty({ type: () => RegisterUnitDetailsDto })
  @ValidateNested()
  @Type(() => RegisterUnitDetailsDto)
  unit: RegisterUnitDetailsDto;
}
