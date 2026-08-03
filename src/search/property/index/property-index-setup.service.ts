import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ISearchProvider } from '../../core/interfaces/search-provider.interface';
import { SEARCH_PROVIDER } from '../../core/search.tokens';
import {
  PROPERTY_INDEX_DEFINITION,
  PROPERTY_INDEX_NAME,
} from './property-index.config';

@Injectable()
export class PropertyIndexSetupService implements OnModuleInit {
  private readonly logger = new Logger(PropertyIndexSetupService.name);

  constructor(
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    const exists = await this.searchProvider.indexExists(PROPERTY_INDEX_NAME);
    if (exists) {
      this.logger.log(
        `Index "${PROPERTY_INDEX_NAME}" already exists, skipping setup.`,
      );
      return;
    }
    await this.searchProvider.createIndex(
      PROPERTY_INDEX_NAME,
      PROPERTY_INDEX_DEFINITION,
    );
    this.logger.log(`Created index "${PROPERTY_INDEX_NAME}".`);
  }
}
