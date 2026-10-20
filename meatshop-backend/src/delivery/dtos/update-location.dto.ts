import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsISO8601,
  IsUUID,
  IsBoolean,
  Equals,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
const rawValue = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key];

export class UpdateLocationDto {
  @ApiProperty() @Transform(rawValue) @IsNumber() @IsLatitude() latitude: number;
  @ApiProperty() @Transform(rawValue) @IsNumber() @IsLongitude() longitude: number;
  @ApiProperty({ description: 'Horizontal accuracy in meters, at most 150' })
  @Transform(rawValue)
  @IsNumber()
  @Min(0)
  @Max(150)
  accuracy: number;

  @ApiProperty() @IsISO8601({ strict: true }) captured_at: string;
  @ApiProperty() @IsUUID('4') sample_id: string;
  @ApiProperty() @IsUUID('4') session_id: string;
  @ApiProperty() @Transform(rawValue) @IsBoolean() @Equals(false) is_mocked: boolean;
}
export class SharingConsentDto {
  @ApiProperty() @Transform(rawValue) @IsBoolean() enabled: boolean;
}
