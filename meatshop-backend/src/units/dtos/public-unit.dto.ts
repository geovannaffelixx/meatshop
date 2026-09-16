import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '../entities/unit.entity';

export class PublicUnitDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() city: string;
  @ApiProperty() state: string;
  @ApiProperty() zip_code: string;
  @ApiPropertyOptional({ nullable: true }) street: string | null;
  @ApiPropertyOptional({ nullable: true }) number: string | null;
  @ApiPropertyOptional({ nullable: true }) complement: string | null;
  @ApiPropertyOptional({ nullable: true }) neighborhood: string | null;
  @ApiPropertyOptional({ nullable: true }) latitude: number | null;
  @ApiPropertyOptional({ nullable: true }) longitude: number | null;
  @ApiPropertyOptional({ nullable: true }) image_url: string | null;
  @ApiPropertyOptional({ nullable: true }) cover_url: string | null;
  @ApiPropertyOptional({ nullable: true }) distance_km?: number | null;
  @ApiProperty() average_rating: number;
  @ApiProperty() review_count: number;

  static fromEntity(
    unit: Unit,
    distanceKm?: number | null,
    ratings: { average: number; count: number } = { average: 0, count: 0 },
  ): PublicUnitDto {
    const dto = new PublicUnitDto();
    dto.id = unit.id;
    dto.name = unit.name;
    dto.city = unit.city;
    dto.state = unit.state;
    dto.zip_code = unit.zip_code;
    dto.street = unit.street;
    dto.number = unit.number;
    dto.complement = unit.complement;
    dto.neighborhood = unit.neighborhood;
    dto.latitude = unit.latitude == null ? null : Number(unit.latitude);
    dto.longitude = unit.longitude == null ? null : Number(unit.longitude);
    dto.image_url = unit.image_url;
    dto.cover_url = unit.cover_url;
    if (distanceKm !== undefined) dto.distance_km = distanceKm;
    dto.average_rating = ratings.average;
    dto.review_count = ratings.count;
    return dto;
  }
}
