import { Module } from '@nestjs/common';
import { SearchCoreModule } from './core/search-core.module';
import { PropertySearchModule } from './property/property-search.module';

@Module({
  imports: [SearchCoreModule, PropertySearchModule],
})
export class SearchModule {}
