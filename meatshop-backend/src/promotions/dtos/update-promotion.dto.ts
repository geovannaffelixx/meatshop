import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePromotionDto } from './create-promotion.dto';

export class UpdatePromotionDto extends PartialType(
  OmitType(CreatePromotionDto, ['unit_id', 'product_id'] as const),
) {}
