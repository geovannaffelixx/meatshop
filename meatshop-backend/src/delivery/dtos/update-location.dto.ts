import { IsLatitude, IsLongitude } from 'class-validator';

export class UpdateLocationDto {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}
