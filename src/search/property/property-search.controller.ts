import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SearchPropertyDto } from './dto/search-property.dto';
import { PropertySearchFacade } from './property-search.facade';

@Controller('search/properties')
export class PropertySearchController {
  constructor(private readonly searchFacade: PropertySearchFacade) {}

  @Public()
  @Get('search')
  search(@Query() query: SearchPropertyDto) {
    return this.searchFacade.search(query);
  }
}
