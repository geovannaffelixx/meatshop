import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../reviews/entities/review.entity';
import { FilterPublicUnitsDto } from '../dtos/filter-public-units.dto';
import { PublicUnitDto } from '../dtos/public-unit.dto';
import { Unit } from '../entities/unit.entity';
import { distanceMeters } from '../../delivery/services/tracking-policy';

@Injectable()
export class ListPublicUnitsUseCase {
  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
  ) {}

  async execute(filters: FilterPublicUnitsDto) {
    const located = filters.lat !== undefined;
    if (located !== (filters.lng !== undefined))
      throw new BadRequestException('Latitude and longitude must be provided together');
    const query = this.units.createQueryBuilder('unit');
    if (located) {
      // Clamp the cosine to protect acos from floating-point rounding near identical points.
      const distance =
        '6371 * acos(LEAST(1.0,GREATEST(-1.0,sin(radians(:lat))*sin(radians(unit.latitude::float8)) + cos(radians(:lat))*cos(radians(unit.latitude::float8))*cos(radians(unit.longitude::float8-:lng)))))';
      query
        .andWhere('unit.latitude IS NOT NULL AND unit.longitude IS NOT NULL')
        .andWhere(distance + ' <= LEAST(:radius,unit.delivery_radius_km)', {
          lat: filters.lat,
          lng: filters.lng,
          radius: filters.radius_km ?? 25,
        })
        .addSelect(distance, 'distance')
        .orderBy('distance', 'ASC');
    } else query.orderBy('unit.name', 'ASC');
    query
      .addOrderBy('unit.id', 'ASC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);
    const [units, total] = await query.getManyAndCount();
    const ratings = units.length
      ? await this.reviews
          .createQueryBuilder('r')
          .select('r.unit_id', 'unit_id')
          .addSelect('AVG(r.rating)', 'average')
          .addSelect('COUNT(*)', 'count')
          .where('r.unit_id IN (:...ids)', { ids: units.map((u) => u.id) })
          .andWhere('r.product_id IS NULL')
          .groupBy('r.unit_id')
          .getRawMany<{ unit_id: number; average: string; count: string }>()
      : [];
    const byUnit = new Map(
      ratings.map((r) => [
        r.unit_id,
        { average: Number(Number(r.average).toFixed(1)), count: Number(r.count) },
      ]),
    );
    return {
      data: units.map((unit) =>
        PublicUnitDto.fromEntity(
          unit,
          located
            ? Number(
                (
                  distanceMeters(
                    filters.lat!,
                    filters.lng!,
                    Number(unit.latitude),
                    Number(unit.longitude),
                  ) / 1000
                ).toFixed(2),
              )
            : undefined,
          byUnit.get(unit.id),
        ),
      ),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
    };
  }
}
