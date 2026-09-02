import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Review } from '../../reviews/entities/review.entity';
import { FilterPublicUnitsDto } from '../dtos/filter-public-units.dto';
import { PublicUnitDto } from '../dtos/public-unit.dto';
import { Unit } from '../entities/unit.entity';

@Injectable()
export class ListPublicUnitsUseCase {
  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
  ) {}

  async execute(filters: FilterPublicUnitsDto) {
    const hasLat = filters.lat !== undefined;
    const hasLng = filters.lng !== undefined;
    if (hasLat !== hasLng) {
      throw new BadRequestException('Latitude and longitude must be provided together');
    }

    const all = await this.units.find({ order: { name: 'ASC', id: 'ASC' } });
    const reviews =
      all.length === 0
        ? []
        : await this.reviews.find({
            where: { unit_id: In(all.map((unit) => unit.id)), product_id: IsNull() },
          });
    const ratings = new Map<number, { sum: number; count: number }>();
    for (const review of reviews) {
      const current = ratings.get(review.unit_id) ?? { sum: 0, count: 0 };
      current.sum += review.rating;
      current.count += 1;
      ratings.set(review.unit_id, current);
    }
    const located = all
      .map((unit) => ({
        unit,
        distance: hasLat ? this.distance(filters.lat!, filters.lng!, unit) : null,
      }))
      .filter(
        ({ distance }) => !hasLat || (distance !== null && distance <= (filters.radius_km ?? 25)),
      )
      .sort((a, b) =>
        hasLat ? a.distance! - b.distance! || a.unit.name.localeCompare(b.unit.name) : 0,
      );
    const start = (filters.page - 1) * filters.limit;
    const data = located
      .slice(start, start + filters.limit)
      .map(({ unit, distance }) =>
        PublicUnitDto.fromEntity(
          unit,
          distance == null ? undefined : Number(distance.toFixed(2)),
          this.rating(ratings.get(unit.id)),
        ),
      );
    return {
      data,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: located.length,
        totalPages: Math.max(Math.ceil(located.length / filters.limit), 1),
      },
    };
  }

  private rating(value?: { sum: number; count: number }) {
    return value
      ? { average: Number((value.sum / value.count).toFixed(1)), count: value.count }
      : { average: 0, count: 0 };
  }

  private distance(lat: number, lng: number, unit: Unit): number | null {
    if (unit.latitude == null || unit.longitude == null) return null;
    const radians = (value: number) => (value * Math.PI) / 180;
    const dLat = radians(Number(unit.latitude) - lat);
    const dLng = radians(Number(unit.longitude) - lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(lat)) * Math.cos(radians(Number(unit.latitude))) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
