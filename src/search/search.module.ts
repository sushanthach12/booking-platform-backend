import { Module } from '@nestjs/common';
import { SearchController } from './controllers';
import { SearchCoreModule } from './core/search-core.module';
import { SEARCH_SERVICE } from './interfaces';
import { PropertySearchModule } from './property/property-search.module';
import { SearchService } from './services';

@Module({
  imports: [SearchCoreModule, PropertySearchModule],
  controllers: [SearchController],
  providers: [
    {
      provide: SEARCH_SERVICE,
      useClass: SearchService,
    },
  ],
  exports: [SEARCH_SERVICE],
})
export class SearchModule {}
