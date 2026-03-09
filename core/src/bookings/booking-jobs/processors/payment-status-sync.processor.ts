import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BOOKING_SERVICE } from '../../../database';
import { QUEUE_PAYMENT_STATUS_SYNC } from '../../../queues/queues.module';
import type { IBookingService } from '../../interfaces/booking-service.interface';
import { JOB_SYNC_PAYMENT_STATUS } from '../constants';

export interface PaymentStatusSyncPayload {
  transactionId: string;
  status: string;
}

@Processor(QUEUE_PAYMENT_STATUS_SYNC, { concurrency: 1 })
@Injectable()
export class PaymentStatusSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentStatusSyncProcessor.name);

  constructor(
    @Inject(BOOKING_SERVICE)
    private readonly bookingService: IBookingService,
  ) {
    super();
  }

  async process(job: Job<PaymentStatusSyncPayload>): Promise<void> {
    if (job.name !== JOB_SYNC_PAYMENT_STATUS) return;
    const { transactionId, status } = job.data;
    try {
      await this.bookingService.syncPaymentStatusFromTransaction(
        transactionId,
        status,
      );
    } catch (err) {
      this.logger.error(
        `Failed to sync booking for payment ${transactionId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
