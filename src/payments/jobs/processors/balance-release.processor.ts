import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import type { IRedisService } from '../../../common/redis/interface/redis.interface';
import {
  BALANCE_SERVICE,
  REDIS_SERVICE,
  WALLET_TRANSACTION_REPOSITORY,
} from '../../../database/di/symbols';
import { QUEUE_BALANCE_RELEASE } from '../../../queues/queues.module';
import type { IBalanceService } from '../../interfaces/balance.service.interface';
import type { IWalletTransactionRepository } from '../../repositories/interfaces/wallet-transaction.repository.interface';
import { JOB_RELEASE_EARNING, JOB_RELEASE_SWEEP } from '../constants';

/** On-hold earnings enqueued per scheduler page (keyset batch size). */
const SWEEP_PAGE_SIZE = 500;
const SWEEP_LOCK_KEY = 'lock:balance-release-sweep';
const SWEEP_LOCK_TTL_MS = 10 * 60 * 1000;

/**
 * Earning-release pipeline. A repeatable scheduler tick (once daily at 01:00
 * UTC) keyset-paginates on-hold earnings whose grace window has elapsed and
 * fans out one idempotent JOB_RELEASE_EARNING per ledger row. The DB rows ARE
 * the schedule (durable) — a failed run loses nothing; the next night
 * re-selects every still-ON_HOLD row. No Redis `delay` jobs.
 */
@Processor(QUEUE_BALANCE_RELEASE, { concurrency: 1 })
@Injectable()
export class BalanceReleaseProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(BalanceReleaseProcessor.name);

  constructor(
    @InjectQueue(QUEUE_BALANCE_RELEASE)
    private readonly releaseQueue: Queue,
    @Inject(BALANCE_SERVICE)
    private readonly balanceService: IBalanceService,
    @Inject(WALLET_TRANSACTION_REPOSITORY)
    private readonly walletTransactionRepository: IWalletTransactionRepository,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.releaseQueue.add(
      JOB_RELEASE_SWEEP,
      {},
      {
        repeat: { pattern: '0 1 * * *', tz: 'UTC' }, // daily at 01:00 UTC
        jobId: JOB_RELEASE_SWEEP,
      },
    );
    this.logger.debug('Balance release scheduler registered (daily 01:00 UTC)');
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_RELEASE_SWEEP:
        return this.runScheduler();
      case JOB_RELEASE_EARNING:
        return this.balanceService.releaseEarning(
          (job.data as { walletTransactionId: string }).walletTransactionId,
        );
      default:
        return;
    }
  }

  /** Keyset-scan due on-hold earnings and enqueue one release job per row. */
  private async runScheduler(): Promise<void> {
    const lock = await this.redisService.acquireLock(
      SWEEP_LOCK_KEY,
      SWEEP_LOCK_TTL_MS,
    );
    if (!lock) {
      this.logger.debug('Release sweep already running; skipping this tick');
      return;
    }

    try {
      const now = new Date();
      let cursor: string | null = null;
      let enqueued = 0;

      for (;;) {
        const due = await this.walletTransactionRepository.findDueForRelease(
          now,
          cursor,
          SWEEP_PAGE_SIZE,
        );
        if (!due.length) break;

        await this.releaseQueue.addBulk(
          due.map((txn) => ({
            name: JOB_RELEASE_EARNING,
            data: { walletTransactionId: txn.id },
            opts: {
              jobId: `${JOB_RELEASE_EARNING}:${txn.id}`,
              attempts: 5,
              backoff: { type: 'exponential', delay: 5000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          })),
        );

        enqueued += due.length;
        cursor = due[due.length - 1].id;
        if (due.length < SWEEP_PAGE_SIZE) break;
      }

      this.logger.debug(`Release sweep enqueued ${enqueued} earning(s)`);
    } finally {
      await this.redisService.releaseLock(SWEEP_LOCK_KEY, lock);
    }
  }
}
