import { Inject, Injectable } from '@nestjs/common';
import { IIndexable } from '../core/interfaces/indexable.interface';
import { ISearchProvider } from '../core/interfaces/search-provider.interface';
import { SEARCH_PROVIDER } from '../core/search.tokens';
import { PROPERTY_INDEX_NAME } from './index/property-index.config';
import { IProperyEntity } from './interfaces/property-document.interface';
import { PropertyDocumentMapper } from './mappers/property-document.mapper';

/**
 * Single responsibility: keep the OpenSearch index in sync with Property
 * entities. Knows nothing about queues, events, or HTTP — just indexing.
 */
@Injectable()
export class PropertyIndexingService implements IIndexable<IProperyEntity> {
  constructor(
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
    private readonly mapper: PropertyDocumentMapper,
  ) {}

  async indexOne(entity: IProperyEntity): Promise<void> {
    const doc = this.mapper.toDocument(entity);
    await this.searchProvider.index(PROPERTY_INDEX_NAME, doc.id, doc);
  }

  async indexMany(entities: IProperyEntity[]): Promise<void> {
    const docs = entities.map((e) => ({
      id: e.id,
      document: this.mapper.toDocument(e),
    }));
    await this.searchProvider.bulkIndex(PROPERTY_INDEX_NAME, docs);
  }

  async remove(id: string): Promise<void> {
    await this.searchProvider.delete(PROPERTY_INDEX_NAME, id);
  }
}
