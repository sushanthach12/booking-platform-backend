import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_BOOKING_PAYMENT_TIMEOUT } from '../../../queues/queues.module';
import { BookingService } from '../../services/booking.service';
import { JOB_EXPIRE_UNPAID_BOOKING } from '../constants';

export interface ExpireUnpaidBookingPayload {
  bookingId: string;
  paymentTransactionId: string;
}

@Processor(QUEUE_BOOKING_PAYMENT_TIMEOUT)
@Injectable()
export class BookingPaymentTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingPaymentTimeoutProcessor.name);

  constructor(private readonly bookingService: BookingService) {
    super();
  }

  async process(job: Job<ExpireUnpaidBookingPayload>): Promise<void> {
    if (job.name !== JOB_EXPIRE_UNPAID_BOOKING) return;
    const { bookingId, paymentTransactionId } = job.data;
    const expired = await this.bookingService.expireUnpaidBookingIfStillPending(
      bookingId,
      paymentTransactionId,
    );
    if (!expired) {
      this.logger.debug(
        `Booking ${bookingId} not expired (already paid or cancelled)`,
      );
    }
  }
}
