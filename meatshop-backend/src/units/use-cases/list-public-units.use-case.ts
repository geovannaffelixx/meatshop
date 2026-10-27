import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Review } from '../../reviews/entities/review.entity';
import { FilterPublicUnitsDto } from '../dtos/filter-public-units.dto';
import { PublicUnitDto } from '../dtos/public-unit.dto';
import { Unit } from '../entities/unit.entity';
import { distanceMeters } from '../../delivery/services/tracking-policy';

const DEFAULT_RADIUS_KM = 25;
const METERS_PER_KM = 1000;
const ACCENTED = 'áàâãäéèêëíìîïóòôõöúùûüç';
const UNACCENTED = 'aaaaaeeeeiiiiooooouuuuc';
const DISTANCE_KM_SQL =
  '6371 * acos(LEAST(1.0,GREATEST(-1.0,sin(radians(:lat))*sin(radians(unit.latitude::float8)) + cos(radians(:lat))*cos(radians(unit.latitude::float8))*cos(radians(unit.longitude::float8-:lng)))))';

type UnitRating = { average: number; count: number };

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
    const query = this.units
      .createQueryBuilder('unit')
      .andWhere('unit.is_active = :unitActive', { unitActive: true });
    this.applyLocationFilters(query, filters);
    if (located) this.applyDistance(query, filters);
    else query.orderBy('unit.name', 'ASC');
    query
      .addOrderBy('unit.id', 'ASC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);
    const [units, total] = await query.getManyAndCount();
    const ratings = await this.ratingsByUnit(units);
    return {
      data: units.map((unit) =>
        PublicUnitDto.fromEntity(unit, this.distanceKm(unit, filters), ratings.get(unit.id)),
      ),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
    };
  }

  private applyLocationFilters(query: SelectQueryBuilder<Unit>, filters: FilterPublicUnitsDto) {
    if (filters.city?.trim()) {
      query.andWhere(
        `translate(LOWER(TRIM(unit.city)), '${ACCENTED}', '${UNACCENTED}') = translate(LOWER(:city), '${ACCENTED}', '${UNACCENTED}')`,
        { city: filters.city.trim() },
      );
    }
    if (filters.region?.trim()) {
      query.andWhere(
        '(LOWER(unit.state) = LOWER(:region) OR LOWER(unit.neighborhood) LIKE LOWER(:regionTerm))',
        {
          region: filters.region.trim(),
          regionTerm: `%${filters.region.trim()}%`,
        },
      );
    }
  }

  private applyDistance(query: SelectQueryBuilder<Unit>, filters: FilterPublicUnitsDto) {
    query
      .andWhere('unit.latitude IS NOT NULL AND unit.longitude IS NOT NULL')
      .andWhere(DISTANCE_KM_SQL + ' <= LEAST(:radius,unit.delivery_radius_km)', {
        lat: filters.lat,
        lng: filters.lng,
        radius: filters.radius_km ?? DEFAULT_RADIUS_KM,
      })
      .addSelect(DISTANCE_KM_SQL, 'distance')
      .orderBy('distance', 'ASC');
  }

  private distanceKm(unit: Unit, filters: FilterPublicUnitsDto): number | undefined {
    if (filters.lat === undefined || filters.lng === undefined) return undefined;
    const meters = distanceMeters(
      filters.lat,
      filters.lng,
      Number(unit.latitude),
      Number(unit.longitude),
    );
    return Number((meters / METERS_PER_KM).toFixed(2));
  }

  private async ratingsByUnit(units: Unit[]): Promise<Map<number, UnitRating>> {
    if (units.length === 0) return new Map();
    const ratings = await this.reviews
      .createQueryBuilder('r')
      .select('r.unit_id', 'unit_id')
      .addSelect('AVG(r.rating)', 'average')
      .addSelect('COUNT(*)', 'count')
      .where('r.unit_id IN (:...ids)', { ids: units.map((u) => u.id) })
      .andWhere('r.product_id IS NULL')
      .groupBy('r.unit_id')
      .getRawMany<{ unit_id: number; average: string; count: string }>();
    return new Map(
      ratings.map((r) => [
        r.unit_id,
        { average: Number(Number(r.average).toFixed(1)), count: Number(r.count) },
      ]),
    );
  }
}
