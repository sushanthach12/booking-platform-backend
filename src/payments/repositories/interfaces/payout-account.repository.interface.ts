import type { PayoutAccountEntity } from '../../entities/payout-account.entity';

export interface IPayoutAccountRepository {
  findByHost(hostId: string): Promise<PayoutAccountEntity[]>;
  countByHost(hostId: string): Promise<number>;
  create(data: Partial<PayoutAccountEntity>): Promise<PayoutAccountEntity>;
}
