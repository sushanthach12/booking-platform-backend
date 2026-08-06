import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ISearchProvider } from '../../core/interfaces/search-provider.interface';
import { SEARCH_PROVIDER } from '../../core/search.tokens';
import {
  PROPERTY_INDEX_ALIAS,
  PROPERTY_INDEX_DEFINITION,
  PROPERTY_INDEX_NAME,
} from './property-index.config';

/**
 * Mappings are immutable in OpenSearch once a field type is set, so the
 * document shape is versioned behind an alias (`properties` -> `properties_v2`)
 * rather than mutating a fixed index name in place. Bumping
 * PROPERTY_INDEX_VERSION and re-running a backfill is how a future mapping
 * change ships, with the alias flip being the only thing consumers see.
 */
@Injectable()
export class PropertyIndexSetupService implements OnModuleInit {
  private readonly logger = new Logger(PropertyIndexSetupService.name);

  constructor(
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    const exists = await this.searchProvider.indexExists(PROPERTY_INDEX_NAME);
    if (!exists) {
      await this.searchProvider.createIndex(
        PROPERTY_INDEX_NAME,
        PROPERTY_INDEX_DEFINITION,
      );
      this.logger.log(`Created index "${PROPERTY_INDEX_NAME}".`);
    }

    const aliasTargets =
      await this.searchProvider.getAliasTargets(PROPERTY_INDEX_ALIAS);
    if (!aliasTargets.includes(PROPERTY_INDEX_NAME)) {
      await this.searchProvider.putAlias(
        PROPERTY_INDEX_NAME,
        PROPERTY_INDEX_ALIAS,
      );
      this.logger.log(
        `Alias "${PROPERTY_INDEX_ALIAS}" now points at "${PROPERTY_INDEX_NAME}".`,
      );
    }
  }
}
