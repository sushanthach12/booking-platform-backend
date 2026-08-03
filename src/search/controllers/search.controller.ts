import { Controller, Inject } from '@nestjs/common';
import { ISearchService, SEARCH_SERVICE } from '../interfaces';

@Controller('search')
export class SearchController {
  constructor(
    @Inject(SEARCH_SERVICE)
    private readonly searchService: ISearchService,
  ) {}
}
