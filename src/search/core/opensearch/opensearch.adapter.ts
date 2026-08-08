import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { Bulk_RequestBody } from '@opensearch-project/opensearch/api/index.js';
import {
  ISearchProvider,
  IndexRequest,
  SearchResult,
} from '../interfaces/search-provider.interface';
import { OPENSEARCH_RAW_CLIENT } from './opensearch-client.provider';

/**
 * Adapter pattern: translates the generic ISearchProvider contract into
 * OpenSearch-specific SDK calls. If you ever swap OpenSearch for
 * Elasticsearch or Algolia, this is the only class that needs to change —
 * every service consuming ISearchProvider stays untouched (Liskov
 * substitution: any ISearchProvider implementation is a drop-in swap).
 */
@Injectable()
export class OpenSearchAdapter implements ISearchProvider, OnModuleInit {
  private readonly logger = new Logger(OpenSearchAdapter.name);
  constructor(@Inject(OPENSEARCH_RAW_CLIENT) private readonly client: Client) {}

  onModuleInit(): void {
    // Fire-and-forget: OpenSearch is the only remote (Aiven, over the
    // internet) dependency in bootstrap. Awaiting it here would gate
    // app.listen() on a TLS round-trip to a cloud host; errors are already
    // caught and logged, so the app boots regardless of reachability.
    void this.ping();
  }

  private async ping(): Promise<void> {
    try {
      await this.client.ping();
      this.logger.debug('Successfully connected to OpenSearch');
    } catch (error) {
      this.logger.error('Error occurred while pinging OpenSearch:', error);
    }
  }

  async index<T>(
    indexName: string,
    id: string,
    document: T,
    refresh = false,
  ): Promise<void> {
    await this.client.index({
      index: indexName,
      id,
      body: document as any,
      refresh,
    });
  }

  async bulkIndex<T>(
    indexName: string,
    docs: IndexRequest<T>[],
    refresh = false,
  ): Promise<void> {
    if (!docs.length) return;

    const body: Bulk_RequestBody = docs.flatMap(({ id, document }) => [
      { index: { _index: indexName, _id: id } },
      document,
    ]) as Record<string, any>[];

    const { body: response } = await this.client.bulk({ body, refresh });

    if (response.errors) {
      const failed = response.items.filter((item: any) => item.index?.error);
      throw new Error(
        `Bulk index into "${indexName}" had ${failed.length} failure(s): ${JSON.stringify(failed[0])}`,
      );
    }
  }

  async delete(indexName: string, id: string): Promise<void> {
    await this.client.delete({ index: indexName, id }).catch((err) => {
      // 404 just means it was never indexed / already gone — not an error for us
      if (err?.meta?.statusCode !== 404) throw err;
    });
  }

  async search<T>(
    indexName: string,
    body: Record<string, any>,
  ): Promise<SearchResult<T>> {
    const { body: response } = await this.client.search({
      index: indexName,
      body,
    });

    const rawTotal = response.hits.total as
      | number
      | { value: number; relation: string }
      | undefined;
    const total =
      typeof rawTotal === 'number' ? rawTotal : (rawTotal?.value ?? 0);

    return {
      total: total,
      hits: response.hits.hits.map((hit: any) => hit._source as T),
      aggregations: response.aggregations,
    };
  }

  async createIndex(
    indexName: string,
    body: Record<string, any>,
  ): Promise<void> {
    await this.client.indices.create({ index: indexName, body });
  }

  async indexExists(indexName: string): Promise<boolean> {
    const { body: exists } = await this.client.indices.exists({
      index: indexName,
    });
    return exists;
  }

  async putAlias(indexName: string, alias: string): Promise<void> {
    const currentTargets = await this.getAliasTargets(alias);
    const actions = [
      ...currentTargets
        .filter((target) => target !== indexName)
        .map((target) => ({ remove: { index: target, alias } })),
      { add: { index: indexName, alias } },
    ];
    await this.client.indices.updateAliases({ body: { actions } });
  }

  async getAliasTargets(alias: string): Promise<string[]> {
    try {
      const { body } = await this.client.indices.getAlias({ name: alias });
      return Object.keys(body);
    } catch (err: any) {
      if (err?.meta?.statusCode === 404) return [];
      throw err;
    }
  }

  async putMapping(
    indexName: string,
    properties: Record<string, any>,
  ): Promise<void> {
    await this.client.indices.putMapping({
      index: indexName,
      body: { properties },
    });
  }
}
