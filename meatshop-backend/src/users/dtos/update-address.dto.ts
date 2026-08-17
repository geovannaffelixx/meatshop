import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-address.dto';

export class UpdateAddressDto extends PartialType(
  OmitType(CreateAddressDto, ['is_default'] as const),
) {}
