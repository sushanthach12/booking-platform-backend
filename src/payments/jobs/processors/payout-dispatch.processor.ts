import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_PAYOUT_DISPATCH } from '../../../queues/queues.module';
import { PayoutService } from '../../services/payout.service';
import { JOB_DISPATCH_PAYOUT } from '../constants';

/**
 * Dispatches queued payouts to Cashfree. Thin plumbing — all logic (idempotent
 * transfer, status update, debit reversal on rejection) lives in
 * PayoutService.dispatchPayout. Errors are re-thrown so BullMQ retries with the
 * same idempotent transfer_id.
 */
@Processor(QUEUE_PAYOUT_DISPATCH, { concurrency: 1 })
@Injectable()
export class PayoutDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(PayoutDispatchProcessor.name);

  constructor(private readonly payoutService: PayoutService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_DISPATCH_PAYOUT) return;
    const { payoutId } = job.data as { payoutId: string };
    this.logger.debug(`Dispatching payout ${payoutId}`);
    await this.payoutService.dispatchPayout(payoutId);
  }
}
