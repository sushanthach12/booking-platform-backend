import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import {
  JOB_DELETE_PROPERTY,
  JOB_INDEX_PROPERTY,
  PROPERTY_SEARCH_QUEUE,
} from './constants';
import { PropertySearchQueueService } from './property-search-queue.service';

describe('PropertySearchQueueService', () => {
  const propertyId = 'e9f0f7a4-1c2b-4d5e-8f90-a1b2c3d4e5f6';
  let queue: { add: jest.Mock };
  let service: PropertySearchQueueService;

  beforeEach(async () => {
    queue = { add: jest.fn().mockResolvedValue({ id: '1' }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PropertySearchQueueService,
        { provide: getQueueToken(PROPERTY_SEARCH_QUEUE), useValue: queue },
      ],
    }).compile();

    service = moduleRef.get(PropertySearchQueueService);
  });

  // Regression: a stable `jobId` per property made BullMQ silently drop every
  // add after the first, because completed jobs are retained (removeOnComplete: 1000)
  // and their keys keep deduplicating new adds forever.
  it('does not reuse a job id across repeated index enqueues for the same property', async () => {
    await service.enqueueIndex(propertyId);
    await service.enqueueIndex(propertyId);

    const [first, second] = queue.add.mock.calls.map(
      ([, , opts]: [string, unknown, { jobId?: string }]) => opts?.jobId,
    );

    expect(first).toBeUndefined();
    expect(second).toBeUndefined();
  });

  it('does not reuse a job id across repeated delete enqueues for the same property', async () => {
    await service.enqueueDelete(propertyId);
    await service.enqueueDelete(propertyId);

    const jobIds = queue.add.mock.calls.map(
      ([, , opts]: [string, unknown, { jobId?: string }]) => opts?.jobId,
    );

    expect(jobIds).toEqual([undefined, undefined]);
  });

  it('enqueues index jobs with the property id and retry options', async () => {
    await service.enqueueIndex(propertyId);

    expect(queue.add).toHaveBeenCalledWith(
      JOB_INDEX_PROPERTY,
      { propertyId },
      expect.objectContaining({
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
      }),
    );
  });

  it('enqueues delete jobs with the property id', async () => {
    await service.enqueueDelete(propertyId);

    expect(queue.add).toHaveBeenCalledWith(
      JOB_DELETE_PROPERTY,
      { propertyId },
      expect.objectContaining({ attempts: 5 }),
    );
  });
});
