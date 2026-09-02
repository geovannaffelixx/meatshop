import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PublicUnitDto } from '../dtos/public-unit.dto';
import { Unit } from '../entities/unit.entity';
import { Review } from '../../reviews/entities/review.entity';

@Injectable()
export class GetPublicUnitUseCase {
  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
  ) {}

  async execute(id: number): Promise<PublicUnitDto> {
    const unit = await this.units.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Unit not found');
    const reviews = await this.reviews.find({ where: { unit_id: id, product_id: IsNull() } });
    const average =
      reviews.length === 0
        ? 0
        : Number(
            (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1),
          );
    return PublicUnitDto.fromEntity(unit, undefined, { average, count: reviews.length });
  }
}
