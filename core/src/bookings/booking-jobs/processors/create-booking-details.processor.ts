import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_BOOKING_DETAILS } from '../../../queues/queues.module';
import { BookingSnapshotService } from '../../services/booking-snapshot.service';
import { JOB_CREATE_BOOKING_DETAILS } from '../constants';

export interface CreateBookingDetailsPayload {
  bookingId: string;
}

@Processor(QUEUE_BOOKING_DETAILS, { concurrency: 1 })
@Injectable()
export class CreateBookingDetailsProcessor extends WorkerHost {
  private readonly logger = new Logger(CreateBookingDetailsProcessor.name);

  constructor(private readonly bookingSnapshotService: BookingSnapshotService) {
    super();
  }

  async process(job: Job<CreateBookingDetailsPayload>): Promise<void> {
    if (job.name !== JOB_CREATE_BOOKING_DETAILS) return;
    const { bookingId } = job.data;
    try {
      await this.bookingSnapshotService.createForBooking(bookingId);
    } catch (error) {
      this.logger.error(
        `Failed to create booking snapshot for ${bookingId}: ${error?.message ?? error}`,
      );
      throw error;
    }
  }
}
