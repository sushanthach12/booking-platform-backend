import type { EntityManager } from 'typeorm';
import type { WalletEntity } from '../../entities/wallet.entity';

/** Client-safe view of a host's wallet (decimals normalized to numbers). */
export interface IWallet {
  id: string;
  hostId: string;
  availableBalance: number;
  pendingBalance: number;
  reserveBalance: number;
  currency: string;
  version: number;
  updatedAt: Date;
}

export interface IWalletRepository {
  /** Read-only lookup. Returns null if the host has no wallet yet. */
  findByHostId(hostId: string): Promise<IWallet | null>;

  /**
   * Insert a zero-balance wallet for the host if one does not exist
   * (`ON CONFLICT DO NOTHING`). Safe to call before locking.
   */
  createIfAbsent(
    hostId: string,
    currency: string,
    reserveBalance: number,
    manager: EntityManager,
  ): Promise<void>;

  /**
   * Select the host's wallet row `FOR UPDATE` (pessimistic write lock) within
   * the given transaction. Returns the live entity to mutate, or null.
   */
  lockForUpdate(
    hostId: string,
    manager: EntityManager,
  ): Promise<WalletEntity | null>;

  /** Persist a mutated wallet entity inside the transaction. */
  save(wallet: WalletEntity, manager: EntityManager): Promise<WalletEntity>;
}
