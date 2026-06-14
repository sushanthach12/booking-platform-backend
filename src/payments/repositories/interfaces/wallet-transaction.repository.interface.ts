import type { EntityManager } from 'typeorm';
import type { WalletTransactionEntity } from '../../entities/wallet-transaction.entity';
import type {
  EWalletTransactionCategory,
  EWalletTransactionStatus,
  EWalletTransactionType,
} from '../../enums/wallet.enum';

/** Client-safe view of a ledger entry (decimals normalized to numbers). */
export interface IWalletTransaction {
  id: string;
  hostId: string;
  walletId: string;
  type: EWalletTransactionType;
  category: EWalletTransactionCategory;
  amount: number;
  balanceAfter: number;
  status: EWalletTransactionStatus;
  bookingId: string | null;
  payoutId: string | null;
  releaseAt: Date | null;
  description: string | null;
  createdAt: Date;
}

/** Fields required to append a new ledger entry. */
export interface CreateWalletTransactionInput {
  hostId: string;
  walletId: string;
  type: EWalletTransactionType;
  category: EWalletTransactionCategory;
  amount: number;
  balanceAfter: number;
  status: EWalletTransactionStatus;
  bookingId?: string | null;
  payoutId?: string | null;
  releaseAt?: Date | null;
  description?: string | null;
}

export interface IWalletTransactionRepository {
  /** True if a BOOKING_EARNING entry already exists for the booking. */
  bookingEarningExists(bookingId: string): Promise<boolean>;

  /** Append a ledger entry within the given transaction. */
  insert(
    data: CreateWalletTransactionInput,
    manager: EntityManager,
  ): Promise<WalletTransactionEntity>;

  /** Select a ledger entry `FOR UPDATE` within the transaction. */
  lockById(
    id: string,
    manager: EntityManager,
  ): Promise<WalletTransactionEntity | null>;

  /** Select a payout's ledger entry of a given category `FOR UPDATE`. */
  lockByPayout(
    payoutId: string,
    category: EWalletTransactionCategory,
    manager: EntityManager,
  ): Promise<WalletTransactionEntity | null>;

  /** Persist a mutated ledger entry inside the transaction. */
  save(
    txn: WalletTransactionEntity,
    manager: EntityManager,
  ): Promise<WalletTransactionEntity>;

  /**
   * Keyset page of on-hold earnings whose grace window has elapsed
   * (`status = 'ON_HOLD' AND releaseAt <= dueAt AND id > afterId`), ordered by
   * id. Drives the daily release sweep.
   */
  findDueForRelease(
    dueAt: Date,
    afterId: string | null,
    limit: number,
  ): Promise<IWalletTransaction[]>;
}
