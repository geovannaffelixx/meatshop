import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { MarketplaceSearchDto } from './dtos/marketplace-search.dto';
import { MarketplaceSearchService } from './marketplace-search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly search: MarketplaceSearchService) {}
  @Public()
  @Get()
  @ApiOperation({ summary: 'Busca pública combinada no marketplace' })
  execute(@Query() filters: MarketplaceSearchDto) {
    return this.search.execute(filters);
  }
}
