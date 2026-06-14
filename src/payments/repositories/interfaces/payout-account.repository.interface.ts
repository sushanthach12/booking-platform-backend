import type { PayoutAccountEntity } from '../../entities/payout-account.entity';

export interface IPayoutAccountRepository {
  findByHost(hostId: string): Promise<PayoutAccountEntity[]>;
  /** Scoped lookup — only returns the account if it belongs to `hostId`. */
  findByIdAndHost(
    id: string,
    hostId: string,
  ): Promise<PayoutAccountEntity | null>;
  countByHost(hostId: string): Promise<number>;
  create(data: Partial<PayoutAccountEntity>): Promise<PayoutAccountEntity>;
  /** Hard-delete a payout account by id. */
  delete(id: string): Promise<void>;
  /**
   * Make `id` the host's only primary account, atomically: clears any existing
   * primary for the host, then marks this one.
   */
  setPrimary(id: string, hostId: string): Promise<void>;
}
