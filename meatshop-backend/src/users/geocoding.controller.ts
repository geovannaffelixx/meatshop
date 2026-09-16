import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { UnitAddressService } from '../units/services/unit-address.service';
import { ResolveAddressDto } from './dtos/resolve-address.dto';

@ApiTags('Geocoding')
@ApiBearerAuth('access-token')
@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly addressService: UnitAddressService) {}

  @Public()
  @Post('resolve')
  @ApiOperation({
    summary: 'Resolves an address and coordinates from a postal code',
  })
  async resolve(@Body() dto: ResolveAddressDto) {
    const address = await this.addressService.lookupByCep(dto.zip_code);
    return {
      ...address,
      source: 'BRASIL_API',
      precision: 'POSTAL_CODE',
    };
  }
}
