import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { LessThanOrEqual, Repository } from 'typeorm';
import { QUEUE_BOOKING_COMPLETION } from '../../../queues/queues.module';
import { BookingEntity } from '../../entities';
import { BookingStatus } from '../../enums';

export const JOB_COMPLETE_PAST_BOOKINGS = 'complete-past-bookings';

@Processor(QUEUE_BOOKING_COMPLETION, { concurrency: 1 })
@Injectable()
export class BookingCompletionProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(BookingCompletionProcessor.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectQueue(QUEUE_BOOKING_COMPLETION)
    private readonly completionQueue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // Schedule a repeatable job that runs every hour
    await this.completionQueue.add(
      JOB_COMPLETE_PAST_BOOKINGS,
      {},
      {
        repeat: { pattern: '0 * * * *' }, // every hour at :00
        jobId: JOB_COMPLETE_PAST_BOOKINGS,
      },
    );
    this.logger.log('Booking completion repeatable job scheduled (hourly)');
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_COMPLETE_PAST_BOOKINGS) return;

    this.logger.log('Running booking completion sweep');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Find CONFIRMED bookings whose checkout date has passed
    const bookings = await this.bookingRepository.find({
      where: {
        status: BookingStatus.CONFIRMED,
        checkOutDate: LessThanOrEqual(yesterday),
      },
      select: ['id'],
    });

    if (!bookings.length) {
      this.logger.debug('No bookings to complete');
      return;
    }

    const ids = bookings.map((b) => b.id);
    await this.bookingRepository
      .createQueryBuilder()
      .update(BookingEntity)
      .set({
        status: BookingStatus.COMPLETED,
        updatedAt: new Date(),
      })
      .whereInIds(ids)
      .execute();

    this.logger.log(`Marked ${ids.length} booking(s) as COMPLETED`);
  }
}
