import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { WalletTransactionEntity } from '../../entities/wallet-transaction.entity';
import {
  EWalletTransactionCategory,
  EWalletTransactionStatus,
} from '../../enums/wallet.enum';
import type {
  CreateWalletTransactionInput,
  IWalletTransaction,
  IWalletTransactionRepository,
} from '../interfaces/wallet-transaction.repository.interface';

@Injectable()
export class WalletTransactionRepository implements IWalletTransactionRepository {
  constructor(
    @InjectRepository(WalletTransactionEntity)
    private readonly repo: Repository<WalletTransactionEntity>,
  ) {}

  async bookingEarningExists(bookingId: string): Promise<boolean> {
    const count = await this.repo.count({
      where: {
        bookingId,
        category: EWalletTransactionCategory.BOOKING_EARNING,
      },
    });
    return count > 0;
  }

  async insert(
    data: CreateWalletTransactionInput,
    manager: EntityManager,
  ): Promise<WalletTransactionEntity> {
    const entity = manager.create(WalletTransactionEntity, {
      bookingId: null,
      payoutId: null,
      releaseAt: null,
      description: null,
      ...data,
    });
    return manager.save(entity);
  }

  async lockById(
    id: string,
    manager: EntityManager,
  ): Promise<WalletTransactionEntity | null> {
    return manager
      .getRepository(WalletTransactionEntity)
      .createQueryBuilder('txn')
      .setLock('pessimistic_write')
      .where('txn.id = :id', { id })
      .getOne();
  }

  async lockByPayout(
    payoutId: string,
    category: EWalletTransactionCategory,
    manager: EntityManager,
  ): Promise<WalletTransactionEntity | null> {
    return manager
      .getRepository(WalletTransactionEntity)
      .createQueryBuilder('txn')
      .setLock('pessimistic_write')
      .where('txn.payoutId = :payoutId AND txn.category = :category', {
        payoutId,
        category,
      })
      .getOne();
  }

  async save(
    txn: WalletTransactionEntity,
    manager: EntityManager,
  ): Promise<WalletTransactionEntity> {
    return manager.save(txn);
  }

  async findDueForRelease(
    dueAt: Date,
    afterId: string | null,
    limit: number,
  ): Promise<IWalletTransaction[]> {
    const qb = this.repo
      .createQueryBuilder('txn')
      .where('txn.status = :status', {
        status: EWalletTransactionStatus.ON_HOLD,
      })
      .andWhere('txn.releaseAt <= :dueAt', { dueAt })
      .orderBy('txn.id', 'ASC')
      .take(limit);

    if (afterId) {
      qb.andWhere('txn.id > :afterId', { afterId });
    }

    const rows = await qb.getMany();
    return rows.map((r) => this.toModel(r));
  }

  /** Decimals come back from PG as strings — normalize to numbers. */
  private toModel(entity: WalletTransactionEntity): IWalletTransaction {
    return {
      id: entity.id,
      hostId: entity.hostId,
      walletId: entity.walletId,
      type: entity.type,
      category: entity.category,
      amount: Number(entity.amount),
      balanceAfter: Number(entity.balanceAfter),
      status: entity.status,
      bookingId: entity.bookingId,
      payoutId: entity.payoutId,
      releaseAt: entity.releaseAt,
      description: entity.description,
      createdAt: entity.createdAt,
    };
  }
}
