import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_BOOKING_DETAILS } from '../../../queues/queues.module';
import { BookingDetailsService } from '../../services/booking-details.service';
import { JOB_CREATE_BOOKING_DETAILS } from '../constants';

export interface CreateBookingDetailsPayload {
  bookingId: string;
}

@Processor(QUEUE_BOOKING_DETAILS)
@Injectable()
export class CreateBookingDetailsProcessor extends WorkerHost {
  private readonly logger = new Logger(CreateBookingDetailsProcessor.name);

  constructor(private readonly bookingDetailsService: BookingDetailsService) {
    super();
  }

  async process(job: Job<CreateBookingDetailsPayload>): Promise<void> {
    if (job.name !== JOB_CREATE_BOOKING_DETAILS) return;
    const { bookingId } = job.data;
    try {
      await this.bookingDetailsService.createForBooking(bookingId);
    } catch (error) {
      this.logger.error(
        `Failed to create booking details for ${bookingId}: ${error?.message ?? error}`,
      );
      throw error;
    }
  }
}
