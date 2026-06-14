import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PayoutEntity } from '../../entities/payout.entity';
import { EPayoutStatus } from '../../enums/payout.enum';
import type {
  CreatePayoutInput,
  IPayout,
  IPayoutRepository,
  IPayoutSummary,
} from '../interfaces/payout.repository.interface';

@Injectable()
export class PayoutRepository implements IPayoutRepository {
  constructor(
    @InjectRepository(PayoutEntity)
    private readonly repo: Repository<PayoutEntity>,
  ) {}

  async getInTransitTotal(hostId: string): Promise<number> {
    const row = await this.repo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.hostId = :hostId', { hostId })
      .andWhere('p.status = :status', { status: EPayoutStatus.PROCESSING })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  async hasInFlightForAccount(accountId: string): Promise<boolean> {
    const count = await this.repo.count({
      where: [
        {
          hostPayoutAccountId: accountId,
          status: EPayoutStatus.PENDING,
        },
        {
          hostPayoutAccountId: accountId,
          status: EPayoutStatus.PROCESSING,
        },
      ],
    });
    return count > 0;
  }

  async findByHost(
    hostId: string,
    page: number,
    limit: number,
  ): Promise<{ items: IPayout[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      where: { hostId },
      order: { scheduledDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: items.map((p) => this.toModel(p)), total };
  }

  async findUpcoming(hostId: string): Promise<IPayout[]> {
    const items = await this.repo.find({
      where: { hostId, status: EPayoutStatus.PENDING },
      order: { scheduledDate: 'ASC' },
      take: 5,
    });
    return items.map((p) => this.toModel(p));
  }

  async findById(id: string): Promise<IPayout | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toModel(entity) : null;
  }

  async create(
    data: CreatePayoutInput,
    manager?: EntityManager,
  ): Promise<IPayout> {
    const repo = manager ? manager.getRepository(PayoutEntity) : this.repo;
    const entity = repo.create(data);
    const saved = await repo.save(entity);
    return this.toModel(saved);
  }

  async update(
    id: string,
    patch: Partial<PayoutEntity>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(PayoutEntity) : this.repo;
    await repo.update({ id }, patch);
  }

  async getSummary(hostId: string): Promise<IPayoutSummary> {
    const totals = await this.repo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'totalPaidOut')
      .addSelect('MIN(p.paidAt)', 'paidOutSince')
      .where('p.hostId = :hostId', { hostId })
      .andWhere('p.status = :status', { status: EPayoutStatus.PAID })
      .getRawOne<{ totalPaidOut: string; paidOutSince: Date | null }>();

    const monthRow = await this.repo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'thisMonth')
      .where('p.hostId = :hostId', { hostId })
      .andWhere('p.status = :status', { status: EPayoutStatus.PAID })
      .andWhere("date_trunc('month', p.paidAt) = date_trunc('month', NOW())")
      .getRawOne<{ thisMonth: string }>();

    const currencyRow = await this.repo
      .createQueryBuilder('p')
      .select('p.currency', 'currency')
      .where('p.hostId = :hostId', { hostId })
      .orderBy('p.createdAt', 'DESC')
      .limit(1)
      .getRawOne<{ currency: string }>();

    const paidOutSince = totals?.paidOutSince ?? null;
    return {
      totalPaidOut: Number(totals?.totalPaidOut ?? 0),
      paidOutSince:
        paidOutSince instanceof Date
          ? paidOutSince.toISOString()
          : (paidOutSince ?? null),
      thisMonth: Number(monthRow?.thisMonth ?? 0),
      currency: currencyRow?.currency ?? 'INR',
    };
  }

  async getMonthlyPaid(
    hostId: string,
    fromDate: string,
  ): Promise<{ period: string; amount: number }[]> {
    const rows = await this.repo
      .createQueryBuilder('p')
      .select("to_char(date_trunc('month', p.paidAt), 'YYYY-MM')", 'period')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'amount')
      .where('p.hostId = :hostId', { hostId })
      .andWhere('p.status = :status', { status: EPayoutStatus.PAID })
      .andWhere('p.paidAt >= :fromDate', { fromDate })
      .groupBy("date_trunc('month', p.paidAt)")
      .orderBy("date_trunc('month', p.paidAt)", 'ASC')
      .getRawMany<{ period: string; amount: string }>();

    return rows.map((r) => ({ period: r.period, amount: Number(r.amount) }));
  }

  /** Normalize a persisted row (decimals come back as strings from PG). */
  private toModel(entity: PayoutEntity): IPayout {
    return {
      id: entity.id,
      hostId: entity.hostId,
      amount: Number(entity.amount),
      currency: entity.currency,
      status: entity.status,
      scheduledDate: entity.scheduledDate,
      paidAt: entity.paidAt,
      createdAt: entity.createdAt,
      bookingCount: entity.bookingCount,
      accountLast4: entity.accountLast4,
      platformFee: Number(entity.platformFee ?? 0),
      hostPayoutAccountId: entity.hostPayoutAccountId,
      cashfreeTransferId: entity.cashfreeTransferId,
      cashfreeStatus: entity.cashfreeStatus,
      failureReason: entity.failureReason,
      processedAt: entity.processedAt,
      transferUtr: entity.transferUtr,
    };
  }
}
