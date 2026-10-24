import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { MarketplaceBrandsDto, MarketplaceSearchDto } from './dtos/marketplace-search.dto';
import { MarketplaceSearchService } from './marketplace-search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly search: MarketplaceSearchService) {}

  @Public()
  @Get('brands')
  @ApiOperation({
    summary: 'Lists brands from products currently available in the marketplace',
  })
  brands(@Query() filters: MarketplaceBrandsDto) {
    return this.search.listBrands(filters);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Combined public marketplace search' })
  execute(@Query() filters: MarketplaceSearchDto) {
    return this.search.execute(filters);
  }
}
