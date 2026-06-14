import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import {
  PAYOUT_REPOSITORY,
  PLATFORM_COMMISSION,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
} from '../../database/di/symbols';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';
import {
  EWalletTransactionCategory,
  EWalletTransactionStatus,
  EWalletTransactionType,
} from '../enums/wallet.enum';
import type {
  IBalanceService,
  IHostBalance,
} from '../interfaces/balance.service.interface';
import type { IPlatformCommission } from '../interfaces/platform-commission.interface';
import type { IPayoutRepository } from '../repositories/interfaces/payout.repository.interface';
import type { IWalletRepository } from '../repositories/interfaces/wallet.repository.interface';
import type { IWalletTransactionRepository } from '../repositories/interfaces/wallet-transaction.repository.interface';
import { PayoutSettingsService } from './payout-settings.service';

/** Grace window between a booking completing and its earning becoming payable. */
const GRACE_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Postgres unique-violation SQLSTATE. */
const PG_UNIQUE_VIOLATION = '23505';
const DEFAULT_CURRENCY = 'INR';

@Injectable()
export class BalanceService implements IBalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
    @Inject(WALLET_TRANSACTION_REPOSITORY)
    private readonly walletTransactionRepository: IWalletTransactionRepository,
    @Inject(PAYOUT_REPOSITORY)
    private readonly payoutRepository: IPayoutRepository,
    // Read-only cross-domain projection (upcoming earnings). Injecting the
    // entity repository here avoids a circular dependency on BookingModule,
    // which already imports PaymentModule.
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    private readonly payoutSettings: PayoutSettingsService,
    @Inject(PLATFORM_COMMISSION)
    private readonly commission: IPlatformCommission,
  ) {}

  async creditBookingEarning(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const grandTotal = Number(booking.grandTotal ?? 0);
    const platformFee = Number(booking.platformFee ?? 0);
    const hostNet =
      booking.hostNet != null
        ? Number(booking.hostNet)
        : this.round2(grandTotal - platformFee);

    const completedAt = booking.completedAt ?? new Date();
    await this.writeOnHoldEarning({
      bookingId,
      hostId: booking.hostId,
      currency: booking.currency ?? DEFAULT_CURRENCY,
      hostNet,
      platformFee,
      releaseAt: new Date(completedAt.getTime() + GRACE_WINDOW_MS),
      description: `Earning for booking ${booking.bookingNumber ?? bookingId}`,
    });
  }

  async creditCancellationFee(
    bookingId: string,
    retainedAmount: number,
  ): Promise<void> {
    if (retainedAmount <= 0) return;

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    // Commission is split off the retained fee, same as a normal earning.
    const { hostNet, platformFee } = this.commission.split(retainedAmount);
    const cancelledAt = booking.cancelledAt ?? new Date();
    await this.writeOnHoldEarning({
      bookingId,
      hostId: booking.hostId,
      currency: booking.currency ?? DEFAULT_CURRENCY,
      hostNet,
      platformFee,
      releaseAt: new Date(cancelledAt.getTime() + GRACE_WINDOW_MS),
      description: `Cancellation fee for booking ${booking.bookingNumber ?? bookingId}`,
    });
  }

  /**
   * Shared on-hold earning credit: writes the BOOKING_EARNING credit (host net)
   * plus an optional PLATFORM_FEE debit in one transaction, adding the net to
   * pending. Idempotent via the unique earning-per-booking index — a duplicate
   * (pre-check miss + concurrent insert) is swallowed as a no-op.
   */
  private async writeOnHoldEarning(params: {
    bookingId: string;
    hostId: string;
    currency: string;
    hostNet: number;
    platformFee: number;
    releaseAt: Date;
    description: string;
  }): Promise<void> {
    const { bookingId, hostId, currency, hostNet, platformFee } = params;

    if (
      await this.walletTransactionRepository.bookingEarningExists(bookingId)
    ) {
      this.logger.log(`Earning already credited for booking ${bookingId}`);
      return;
    }
    if (hostNet <= 0 && platformFee <= 0) {
      this.logger.warn(
        `Booking ${bookingId} has no earnings to credit (hostNet=${hostNet})`,
      );
      return;
    }

    const reserve = this.payoutSettings.getReserveAmount();
    try {
      await this.dataSource.transaction(async (manager) => {
        await this.walletRepository.createIfAbsent(
          hostId,
          currency,
          reserve,
          manager,
        );
        const wallet = await this.walletRepository.lockForUpdate(
          hostId,
          manager,
        );
        if (!wallet) {
          throw new Error(`Wallet missing for host ${hostId}`);
        }

        // Net earning goes on hold in pending; the fee never touches the
        // host's balance — it's recorded only as a revenue line.
        wallet.pendingBalance = this.round2(
          Number(wallet.pendingBalance) + hostNet,
        );
        const balanceAfter = this.round2(
          Number(wallet.availableBalance) + Number(wallet.pendingBalance),
        );

        await this.walletTransactionRepository.insert(
          {
            hostId,
            walletId: wallet.id,
            type: EWalletTransactionType.CREDIT,
            category: EWalletTransactionCategory.BOOKING_EARNING,
            amount: hostNet,
            balanceAfter,
            status: EWalletTransactionStatus.ON_HOLD,
            bookingId,
            releaseAt: params.releaseAt,
            description: params.description,
          },
          manager,
        );

        if (platformFee > 0) {
          await this.walletTransactionRepository.insert(
            {
              hostId,
              walletId: wallet.id,
              type: EWalletTransactionType.DEBIT,
              category: EWalletTransactionCategory.PLATFORM_FEE,
              amount: platformFee,
              balanceAfter, // fee does not change the host's balance
              status: EWalletTransactionStatus.COMPLETED,
              bookingId,
              description: 'Platform commission',
            },
            manager,
          );
        }

        await this.walletRepository.save(wallet, manager);
      });
      this.logger.log(
        `Credited ${hostNet} (${currency}) to host ${hostId} for booking ${bookingId}`,
      );
    } catch (error) {
      // A concurrent delivery beat us to the unique earning row — that's the
      // idempotency guarantee doing its job, not a failure.
      if (this.isUniqueViolation(error)) {
        this.logger.log(
          `Earning credit for booking ${bookingId} already exists (race); skipping`,
        );
        return;
      }
      throw error;
    }
  }

  async releaseEarning(walletTransactionId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const txn = await this.walletTransactionRepository.lockById(
        walletTransactionId,
        manager,
      );
      if (!txn || txn.status !== EWalletTransactionStatus.ON_HOLD) {
        // Already released (or not releasable) — idempotent no-op.
        return;
      }

      const wallet = await this.walletRepository.lockForUpdate(
        txn.hostId,
        manager,
      );
      if (!wallet) {
        throw new Error(`Wallet missing for host ${txn.hostId}`);
      }

      const amount = Number(txn.amount);
      wallet.pendingBalance = this.round2(
        Number(wallet.pendingBalance) - amount,
      );
      wallet.availableBalance = this.round2(
        Number(wallet.availableBalance) + amount,
      );

      txn.status = EWalletTransactionStatus.RELEASED;
      // Total (available + pending) is unchanged — funds just move buckets.
      txn.balanceAfter = this.round2(
        Number(wallet.availableBalance) + Number(wallet.pendingBalance),
      );

      await this.walletTransactionRepository.save(txn, manager);
      await this.walletRepository.save(wallet, manager);
    });
  }

  async clawbackForRefund(
    bookingId: string,
    refundedAmount: number,
  ): Promise<void> {
    if (refundedAmount <= 0) return;

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });
    // Clawback applies only post-completion. A non-completed booking that is
    // refunded is the cancellation path (Phase 9), where no earning exists yet.
    if (!booking || booking.status !== BookingStatus.COMPLETED) return;
    if (
      !(await this.walletTransactionRepository.bookingEarningExists(bookingId))
    ) {
      return;
    }

    // Host's share of the refunded amount (the platform keeps its commission).
    const hostShare = this.commission.split(refundedAmount).hostNet;
    if (hostShare <= 0) return;

    await this.dataSource.transaction(async (manager) => {
      const wallet = await this.walletRepository.lockForUpdate(
        booking.hostId,
        manager,
      );
      if (!wallet) return;

      // Reserve absorbs first, then available (which may go negative and net
      // against future earnings) — so the host never has to actively repay us.
      let remaining = hostShare;
      const fromReserve = Math.min(Number(wallet.reserveBalance), remaining);
      wallet.reserveBalance = this.round2(
        Number(wallet.reserveBalance) - fromReserve,
      );
      remaining = this.round2(remaining - fromReserve);
      wallet.availableBalance = this.round2(
        Number(wallet.availableBalance) - remaining,
      );

      const balanceAfter = this.round2(
        Number(wallet.availableBalance) + Number(wallet.pendingBalance),
      );
      await this.walletTransactionRepository.insert(
        {
          hostId: booking.hostId,
          walletId: wallet.id,
          type: EWalletTransactionType.DEBIT,
          category: EWalletTransactionCategory.REFUND_CLAWBACK,
          amount: hostShare,
          balanceAfter,
          status: EWalletTransactionStatus.COMPLETED,
          bookingId,
          description: `Refund clawback for booking ${booking.bookingNumber ?? bookingId}`,
        },
        manager,
      );
      await this.walletRepository.save(wallet, manager);
    });
    this.logger.log(
      `Clawed back ${hostShare} from host ${booking.hostId} for booking ${bookingId}`,
    );
  }

  async reversePayoutDebit(payoutId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const debit = await this.walletTransactionRepository.lockByPayout(
        payoutId,
        EWalletTransactionCategory.PAYOUT,
        manager,
      );
      if (!debit || debit.status === EWalletTransactionStatus.REVERSED) {
        // Nothing to reverse, or already reversed — idempotent no-op.
        return;
      }

      const wallet = await this.walletRepository.lockForUpdate(
        debit.hostId,
        manager,
      );
      if (!wallet) {
        throw new Error(`Wallet missing for host ${debit.hostId}`);
      }

      // Restore the withdrawn amount to available; void the original debit.
      wallet.availableBalance = this.round2(
        Number(wallet.availableBalance) + Number(debit.amount),
      );
      debit.status = EWalletTransactionStatus.REVERSED;
      debit.balanceAfter = this.round2(
        Number(wallet.availableBalance) + Number(wallet.pendingBalance),
      );

      await this.walletTransactionRepository.save(debit, manager);
      await this.walletRepository.save(wallet, manager);
    });
    this.logger.log(`Reversed payout debit for payout ${payoutId}`);
  }

  async getBalance(hostId: string): Promise<IHostBalance> {
    const wallet = await this.walletRepository.findByHostId(hostId);
    const available = wallet?.availableBalance ?? 0;
    const pending = wallet?.pendingBalance ?? 0;
    const reserve =
      wallet?.reserveBalance ?? this.payoutSettings.getReserveAmount();
    const currency = wallet?.currency ?? DEFAULT_CURRENCY;

    const [upcoming, inTransit, summary] = await Promise.all([
      this.sumUpcomingHostNet(hostId),
      this.payoutRepository.getInTransitTotal(hostId),
      this.payoutRepository.getSummary(hostId),
    ]);

    return {
      payableNow: Math.max(0, this.round2(available - reserve)),
      onHold: { upcoming, clearing: this.round2(pending) },
      inTransit,
      lifetimePaidOut: summary.totalPaidOut,
      availableBalance: available,
      reserveBalance: reserve,
      minPayoutThreshold: this.payoutSettings.getMinPayoutThreshold(),
      currency,
    };
  }

  /** Projected host net for confirmed bookings whose stay hasn't completed. */
  private async sumUpcomingHostNet(hostId: string): Promise<number> {
    const row = await this.bookingRepository
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.hostNet), 0)', 'sum')
      .where('b.hostId = :hostId', { hostId })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('b.completedAt IS NULL')
      .getRawOne<{ sum: string }>();
    return this.round2(Number(row?.sum ?? 0));
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
    );
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
