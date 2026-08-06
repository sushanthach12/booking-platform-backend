import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PROPERTY_REPOSITORY } from '../../../database';
import { IPropertyRepository } from '../../../properties/repositories/interfaces/property-repository.interfaces';
import { PROPERTY_SEARCH_FACADE } from '../../core/search.tokens';
import { IPropertySearchFacade } from '../interfaces/property-search-facade.interface';
import {
  JOB_DELETE_PROPERTY,
  JOB_INDEX_PROPERTY,
  JOB_REINDEX_ALL,
  PROPERTY_SEARCH_QUEUE,
} from './constants';

const REINDEX_BATCH_SIZE = 200;

interface IndexJobData {
  propertyId: string;
}

@Processor(PROPERTY_SEARCH_QUEUE, { concurrency: 1 })
export class PropertySearchProcessor extends WorkerHost {
  private readonly logger = new Logger(PropertySearchProcessor.name);

  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepo: IPropertyRepository,
    @Inject(PROPERTY_SEARCH_FACADE)
    private readonly searchFacade: IPropertySearchFacade,
  ) {
    super();
  }

  async process(job: Job<IndexJobData>): Promise<void> {
    switch (job.name) {
      case JOB_INDEX_PROPERTY:
        await this.searchFacade.indexById(job.data.propertyId);
        return;
      case JOB_DELETE_PROPERTY:
        await this.searchFacade.remove(job.data.propertyId);
        return;
      case JOB_REINDEX_ALL:
        await this.reindexAll();
        return;
      default:
        this.logger.warn(`Unknown job name "${job.name}" — skipping.`);
    }
  }

  private async reindexAll(): Promise<void> {
    let afterId: string | undefined;
    let totalIndexed = 0;

    for (;;) {
      const ids = await this.propertyRepo.findPropertyIdsForIndexing({
        afterId,
        limit: REINDEX_BATCH_SIZE,
      });
      if (ids.length === 0) break;

      await this.searchFacade.indexMany(ids);
      totalIndexed += ids.length;
      afterId = ids[ids.length - 1];

      if (ids.length < REINDEX_BATCH_SIZE) break;
    }

    this.logger.log(
      `Reindex-all complete — indexed ${totalIndexed} properties.`,
    );
  }
}
