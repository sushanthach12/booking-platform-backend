import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { WalletEntity } from '../../entities/wallet.entity';
import type {
  IWallet,
  IWalletRepository,
} from '../interfaces/wallet.repository.interface';

@Injectable()
export class WalletRepository implements IWalletRepository {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly repo: Repository<WalletEntity>,
  ) {}

  async findByHostId(hostId: string): Promise<IWallet | null> {
    const entity = await this.repo.findOne({ where: { hostId } });
    return entity ? this.toModel(entity) : null;
  }

  async createIfAbsent(
    hostId: string,
    currency: string,
    reserveBalance: number,
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(WalletEntity)
      .values({
        hostId,
        currency,
        reserveBalance,
        availableBalance: 0,
        pendingBalance: 0,
      })
      .orIgnore() // ON CONFLICT (hostId) DO NOTHING
      .execute();
  }

  async lockForUpdate(
    hostId: string,
    manager: EntityManager,
  ): Promise<WalletEntity | null> {
    return manager
      .getRepository(WalletEntity)
      .createQueryBuilder('wallet')
      .setLock('pessimistic_write')
      .where('wallet.hostId = :hostId', { hostId })
      .getOne();
  }

  async save(
    wallet: WalletEntity,
    manager: EntityManager,
  ): Promise<WalletEntity> {
    return manager.save(wallet);
  }

  /** Decimals come back from PG as strings — normalize to numbers. */
  private toModel(entity: WalletEntity): IWallet {
    return {
      id: entity.id,
      hostId: entity.hostId,
      availableBalance: Number(entity.availableBalance),
      pendingBalance: Number(entity.pendingBalance),
      reserveBalance: Number(entity.reserveBalance),
      currency: entity.currency,
      version: entity.version,
      updatedAt: entity.updatedAt,
    };
  }
}
