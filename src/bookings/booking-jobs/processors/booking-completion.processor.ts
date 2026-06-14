import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { REDIS_SERVICE } from '../../../database/di/symbols';
import type { IRedisService } from '../../../common/redis/interface/redis.interface';
import { QUEUE_BOOKING_COMPLETION } from '../../../queues/queues.module';
import { BookingCompletionService } from '../../services/booking-completion.service';
import { JOB_COMPLETE_BOOKING, JOB_COMPLETE_PAST_BOOKINGS } from '../constants';

/** Bookings enqueued per scheduler page (keyset batch size). */
const SCHEDULER_PAGE_SIZE = 500;
/** Single-runner lock so an overrun can't run concurrently with the next tick. */
const SWEEP_LOCK_KEY = 'lock:booking-completion-sweep';
const SWEEP_LOCK_TTL_MS = 10 * 60 * 1000;

/**
 * Completion pipeline (scales to millions): a repeatable scheduler tick
 * (JOB_COMPLETE_PAST_BOOKINGS) keyset-paginates due bookings and fans out one
 * idempotent JOB_COMPLETE_BOOKING per booking. The scheduler only enqueues;
 * all state changes happen in the per-booking worker (BullMQ retries + DLQ).
 */
@Processor(QUEUE_BOOKING_COMPLETION, { concurrency: 1 })
@Injectable()
export class BookingCompletionProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(BookingCompletionProcessor.name);

  constructor(
    @InjectQueue(QUEUE_BOOKING_COMPLETION)
    private readonly completionQueue: Queue,
    private readonly completionService: BookingCompletionService,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.completionQueue.add(
      JOB_COMPLETE_PAST_BOOKINGS,
      {},
      {
        repeat: { pattern: '0 * * * *' }, // hourly at :00 (UTC)
        jobId: JOB_COMPLETE_PAST_BOOKINGS,
      },
    );
    this.logger.debug('Booking completion scheduler registered (hourly)');
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_COMPLETE_PAST_BOOKINGS:
        return this.runScheduler();
      case JOB_COMPLETE_BOOKING:
        return this.completionService.completeBooking(
          (job.data as { bookingId: string }).bookingId,
        );
      default:
        return;
    }
  }

  /** Keyset-scan due bookings and enqueue one worker job per booking. */
  private async runScheduler(): Promise<void> {
    const lock = await this.redisService.acquireLock(
      SWEEP_LOCK_KEY,
      SWEEP_LOCK_TTL_MS,
    );
    if (!lock) {
      this.logger.debug('Completion sweep already running; skipping this tick');
      return;
    }

    try {
      const now = new Date();
      let cursor: string | null = null;
      let enqueued = 0;

      for (;;) {
        const ids = await this.completionService.findDueBookingIds(
          now,
          cursor,
          SCHEDULER_PAGE_SIZE,
        );
        if (!ids.length) break;

        // Enqueue the page BEFORE advancing the cursor (at-least-once; never
        // drops a page). jobId dedupes if a tick overlaps a previous one.
        await this.completionQueue.addBulk(
          ids.map((bookingId) => ({
            name: JOB_COMPLETE_BOOKING,
            data: { bookingId },
            opts: {
              jobId: `${JOB_COMPLETE_BOOKING}:${bookingId}`,
              attempts: 5,
              backoff: { type: 'exponential', delay: 5000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          })),
        );

        enqueued += ids.length;
        cursor = ids[ids.length - 1];
        if (ids.length < SCHEDULER_PAGE_SIZE) break;
      }

      this.logger.debug(`Completion sweep enqueued ${enqueued} booking(s)`);
    } finally {
      await this.redisService.releaseLock(SWEEP_LOCK_KEY, lock);
    }
  }
}
