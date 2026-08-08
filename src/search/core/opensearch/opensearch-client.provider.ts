import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import * as fs from 'fs';

export const OPENSEARCH_RAW_CLIENT = Symbol('OPENSEARCH_RAW_CLIENT');

/**
 * This is the ONLY place the raw @opensearch-project/opensearch Client
 * is constructed. Nothing outside OpenSearchAdapter should import it
 * directly — everything else talks to ISearchProvider.
 */
export const openSearchClientProvider: Provider = {
  provide: OPENSEARCH_RAW_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Client => {
    const caPath = configService.get<string>('OPENSEARCH_CA_CERT_PATH');
    const caBase64 = configService.get<string>('OPENSEARCH_CA_CERT_BASE64');

    // Only attempt to load a CA if one was actually configured — the
    // current Aiven connection works without this, so an unset/missing
    // path must not break the client.
    const ca = caBase64
      ? Buffer.from(caBase64, 'base64').toString('utf-8')
      : caPath && fs.existsSync(caPath)
        ? fs.readFileSync(caPath)
        : undefined;

    return new Client({
      node: configService.getOrThrow('OPENSEARCH_NODE'),
      auth: {
        username: configService.getOrThrow('OPENSEARCH_USER'),
        password: configService.getOrThrow('OPENSEARCH_PASSWORD'),
      },
      ssl: ca ? { ca, rejectUnauthorized: true } : undefined,
      // Bound how long an unreachable/slow Aiven cluster can hang a request —
      // bootstrap no longer awaits this client, but individual search calls
      // (and the fire-and-forget onModuleInit hooks) still need a ceiling.
      requestTimeout: 5000,
    });
  },
};
