import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import {
  PAYOUT_FAILED,
  PAYOUT_PAID,
  PayoutFailedPayload,
  PayoutPaidPayload,
} from '../../common/events/payment.events';
import {
  BALANCE_SERVICE,
  PAYOUT_ACCOUNT_REPOSITORY,
  PAYOUT_REPOSITORY,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
} from '../../database/di/symbols';
import { QUEUE_PAYOUT_DISPATCH } from '../../queues/queues.module';
import {
  EBeneficiaryStatus,
  EPayoutAccountType,
} from '../enums/payout-account.enum';
import { EPayoutStatus } from '../enums/payout.enum';
import {
  EWalletTransactionCategory,
  EWalletTransactionStatus,
  EWalletTransactionType,
} from '../enums/wallet.enum';
import { PayoutGatewayFactory } from '../factories/payout-gateway.factory';
import type { IBalanceService } from '../interfaces/balance.service.interface';
import type {
  IPayoutService,
  IRequestPayoutResult,
} from '../interfaces/payout.service.interface';
import { JOB_DISPATCH_PAYOUT } from '../jobs/constants';
import type { IPayoutAccountRepository } from '../repositories/interfaces/payout-account.repository.interface';
import type {
  IPayout,
  IPayoutEarnings,
  IPayoutRepository,
  IPayoutSummary,
} from '../repositories/interfaces/payout.repository.interface';
import type { IWalletTransactionRepository } from '../repositories/interfaces/wallet-transaction.repository.interface';
import type { IWalletRepository } from '../repositories/interfaces/wallet.repository.interface';
import { PayoutSettingsService } from './payout-settings.service';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

@Injectable()
export class PayoutService implements IPayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    @Inject(PAYOUT_REPOSITORY)
    private readonly payoutRepository: IPayoutRepository,
    private readonly dataSource: DataSource,
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
    @Inject(WALLET_TRANSACTION_REPOSITORY)
    private readonly walletTransactionRepository: IWalletTransactionRepository,
    @Inject(PAYOUT_ACCOUNT_REPOSITORY)
    private readonly payoutAccountRepository: IPayoutAccountRepository,
    private readonly payoutGatewayFactory: PayoutGatewayFactory,
    @Inject(BALANCE_SERVICE)
    private readonly balanceService: IBalanceService,
    private readonly payoutSettings: PayoutSettingsService,
    @InjectQueue(QUEUE_PAYOUT_DISPATCH)
    private readonly dispatchQueue: Queue,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getPayouts(
    hostId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: IPayout[]; total: number; page: number; limit: number }> {
    const { items, total } = await this.payoutRepository.findByHost(
      hostId,
      page,
      limit,
    );
    return { items, total, page, limit };
  }

  async getUpcoming(hostId: string): Promise<{
    amount: number;
    currency: string;
    scheduledDate: string;
  } | null> {
    const upcoming = await this.payoutRepository.findUpcoming(hostId);
    if (!upcoming.length) return null;
    const next = upcoming[0];
    return {
      amount: Number(next.amount),
      currency: next.currency,
      scheduledDate: next.scheduledDate,
    };
  }

  async getSummary(hostId: string): Promise<IPayoutSummary> {
    return this.payoutRepository.getSummary(hostId);
  }

  /**
   * Earnings for the last `months` calendar months as chart points, with a
   * year-over-year delta against the same month a year prior. Pulls a window
   * of `months + 12` so the YoY baseline is available, then slices the tail.
   */
  async getEarnings(hostId: string, months: number): Promise<IPayoutEarnings> {
    const safeMonths = Math.min(Math.max(Math.trunc(months) || 7, 1), 24);
    const now = new Date();
    const lookback = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (safeMonths + 12), 1),
    );
    const fromDate = lookback.toISOString().slice(0, 10);

    const rows = await this.payoutRepository.getMonthlyPaid(hostId, fromDate);
    const byPeriod = new Map(rows.map((r) => [r.period, r.amount]));

    const points: { month: string; amount: number }[] = [];
    for (let i = safeMonths - 1; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      points.push({
        month: MONTH_LABELS[d.getUTCMonth()],
        amount: byPeriod.get(key) ?? 0,
      });
    }

    const yoyChange = this.computeYoy(now, byPeriod);
    const currency = (await this.payoutRepository.getSummary(hostId)).currency;

    return { points, currency, yoyChange };
  }

  /** % change of the current month vs the same month one year ago. */
  private computeYoy(now: Date, byPeriod: Map<string, number>): number | null {
    const periodKey = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const current = byPeriod.get(periodKey(now)) ?? 0;
    const priorDate = new Date(
      Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1),
    );
    const prior = byPeriod.get(periodKey(priorDate)) ?? 0;
    if (prior === 0) return null;
    return Math.round(((current - prior) / prior) * 100);
  }

  async requestPayout(hostId: string): Promise<IRequestPayoutResult> {
    const accounts = await this.payoutAccountRepository.findByHost(hostId);
    const verified = accounts.find(
      (a) =>
        a.beneficiaryStatus === EBeneficiaryStatus.VERIFIED &&
        a.cashfreeBeneficiaryId,
    );
    if (!verified) {
      throw new BadRequestException(
        'Add a verified payout account before requesting a payout',
      );
    }

    const threshold = this.payoutSettings.getMinPayoutThreshold();
    const scheduledDate = new Date().toISOString().slice(0, 10);

    // One atomic transaction: lock the wallet, create the payout, write the
    // PAYOUT debit, and reduce available — so a double-tap can't double-pay.
    const payout = await this.dataSource.transaction(async (manager) => {
      const wallet = await this.walletRepository.lockForUpdate(hostId, manager);
      if (!wallet) {
        throw new BadRequestException('No balance available to pay out');
      }

      const available = Number(wallet.availableBalance);
      const payable = this.round2(
        Math.max(0, available - Number(wallet.reserveBalance)),
      );
      if (payable <= 0 || payable < threshold) {
        throw new BadRequestException(
          `A minimum payable balance of ${threshold} is required to request a payout`,
        );
      }

      const created = await this.payoutRepository.create(
        {
          hostId,
          amount: payable,
          currency: wallet.currency,
          status: EPayoutStatus.PENDING,
          scheduledDate,
          hostPayoutAccountId: verified.id,
          accountLast4: verified.last4,
          bookingCount: 0,
        },
        manager,
      );

      wallet.availableBalance = this.round2(available - payable);
      const balanceAfter = this.round2(
        wallet.availableBalance + Number(wallet.pendingBalance),
      );
      await this.walletTransactionRepository.insert(
        {
          hostId,
          walletId: wallet.id,
          type: EWalletTransactionType.DEBIT,
          category: EWalletTransactionCategory.PAYOUT,
          amount: payable,
          balanceAfter,
          status: EWalletTransactionStatus.COMPLETED,
          payoutId: created.id,
          description: 'Payout request',
        },
        manager,
      );
      await this.walletRepository.save(wallet, manager);
      return created;
    });

    await this.dispatchQueue.add(
      JOB_DISPATCH_PAYOUT,
      { payoutId: payout.id },
      {
        jobId: `${JOB_DISPATCH_PAYOUT}:${payout.id}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Payout ${payout.id} requested for host ${hostId}`);
    return {
      payoutId: payout.id,
      amount: payout.amount,
      status: payout.status,
    };
  }

  async dispatchPayout(payoutId: string): Promise<void> {
    const payout = await this.payoutRepository.findById(payoutId);
    if (!payout) {
      this.logger.warn(`Payout ${payoutId} not found; skipping dispatch`);
      return;
    }
    if (payout.status !== EPayoutStatus.PENDING) {
      // Already dispatched or terminal — idempotent no-op.
      return;
    }

    const accounts = await this.payoutAccountRepository.findByHost(
      payout.hostId,
    );
    const account =
      accounts.find((a) => a.id === payout.hostPayoutAccountId) ??
      accounts.find(
        (a) =>
          a.beneficiaryStatus === EBeneficiaryStatus.VERIFIED &&
          a.cashfreeBeneficiaryId,
      );

    if (!account?.cashfreeBeneficiaryId) {
      await this.payoutRepository.update(payoutId, {
        status: EPayoutStatus.FAILED,
        failureReason: 'No verified beneficiary for host',
      });
      await this.balanceService.reversePayoutDebit(payoutId);
      return;
    }

    const mode =
      account.accountType === EPayoutAccountType.UPI ? 'upi' : 'imps';

    // May throw on a retryable 5XX (after a confirming GET) — the worker
    // re-throws so BullMQ retries with the same idempotent transfer_id.
    const gateway = this.payoutGatewayFactory.getDefaultGateway();
    const result = await gateway.createTransfer({
      transferId: `PAYOUT_${payoutId}`,
      amount: payout.amount,
      beneficiaryId: account.cashfreeBeneficiaryId,
      mode,
    });

    if (result.accepted) {
      await this.payoutRepository.update(payoutId, {
        status: EPayoutStatus.PROCESSING,
        cashfreeTransferId: result.cfTransferId,
        cashfreeStatus: result.status,
        processedAt: new Date(),
      });
      this.logger.log(`Payout ${payoutId} dispatched (${result.status})`);
    } else {
      await this.payoutRepository.update(payoutId, {
        status: EPayoutStatus.FAILED,
        cashfreeStatus: result.status,
        failureReason: `Transfer rejected: ${result.status}`,
      });
      await this.balanceService.reversePayoutDebit(payoutId);
      this.logger.warn(`Payout ${payoutId} rejected (${result.status})`);
    }
  }

  async handlePayoutWebhook(
    rawBody: string,
    signature: string,
    timestamp: string,
  ): Promise<void> {
    const gateway = this.payoutGatewayFactory.getDefaultGateway();
    const result = gateway.webhookPayout(rawBody, signature, timestamp);
    if (!result.valid || !result.event) {
      this.logger.warn(`Rejected payout webhook: ${result.error}`);
      return;
    }

    const event = result.event;
    if (event.outcome === 'ignored') return;

    const payoutId = event.transferId.replace(/^PAYOUT_/, '');
    const payout = await this.payoutRepository.findById(payoutId);
    if (!payout) {
      this.logger.warn(`Payout webhook for unknown payout ${payoutId}`);
      return;
    }

    if (event.outcome === 'paid') {
      if (payout.status === EPayoutStatus.PAID) return; // idempotent
      await this.payoutRepository.update(payoutId, {
        status: EPayoutStatus.PAID,
        paidAt: new Date(),
        transferUtr: event.transferUtr,
        cashfreeStatus: event.statusCode,
      });
      this.eventEmitter.emit(PAYOUT_PAID, {
        payoutId,
        hostId: payout.hostId,
        amount: payout.amount,
        currency: payout.currency,
        transferUtr: event.transferUtr,
      } satisfies PayoutPaidPayload);
      this.logger.log(
        `Payout ${payoutId} marked paid (UTR ${event.transferUtr})`,
      );
      return;
    }

    if (event.outcome === 'failed') {
      if (payout.status === EPayoutStatus.FAILED) return; // idempotent
      const reason =
        `${event.statusCode ?? ''} ${event.statusDescription ?? ''}`.trim() ||
        'Transfer failed';
      await this.payoutRepository.update(payoutId, {
        status: EPayoutStatus.FAILED,
        failureReason: reason,
        cashfreeStatus: event.statusCode,
      });
      // Restore the funds to the host's available balance.
      await this.balanceService.reversePayoutDebit(payoutId);
      this.eventEmitter.emit(PAYOUT_FAILED, {
        payoutId,
        hostId: payout.hostId,
        amount: payout.amount,
        currency: payout.currency,
        reason,
      } satisfies PayoutFailedPayload);
      this.logger.warn(`Payout ${payoutId} failed: ${reason}`);
      return;
    }

    // processing (ACKNOWLEDGED) — advance pending → processing only.
    if (payout.status === EPayoutStatus.PENDING) {
      await this.payoutRepository.update(payoutId, {
        status: EPayoutStatus.PROCESSING,
        cashfreeStatus: event.statusCode,
      });
    }
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
