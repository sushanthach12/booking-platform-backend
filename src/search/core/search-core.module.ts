import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenSearchKeepAliveService } from './opensearch/opensearch-alive.service';
import { openSearchClientProvider } from './opensearch/opensearch-client.provider';
import { OpenSearchAdapter } from './opensearch/opensearch.adapter';
import { SEARCH_PROVIDER } from './search.tokens';

/**
 * Binds the SEARCH_PROVIDER token to the OpenSearch implementation.
 * This is the single line you'd change to swap search backends later —
 * e.g. `useClass: ElasticsearchAdapter` — with no other file touched.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    openSearchClientProvider,
    {
      provide: SEARCH_PROVIDER,
      useClass: OpenSearchAdapter,
    },
    OpenSearchKeepAliveService,
  ],
  exports: [SEARCH_PROVIDER],
})
export class SearchCoreModule {}
