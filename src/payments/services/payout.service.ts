import { Inject, Injectable } from '@nestjs/common';
import { PAYOUT_REPOSITORY } from '../../database/di/symbols';
import type { IPayoutService } from '../interfaces/payout.service.interface';
import type {
  IPayout,
  IPayoutEarnings,
  IPayoutRepository,
  IPayoutSummary,
} from '../repositories/interfaces/payout.repository.interface';

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
  constructor(
    @Inject(PAYOUT_REPOSITORY)
    private readonly payoutRepository: IPayoutRepository,
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
}
