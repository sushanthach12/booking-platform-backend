import type { CreatePayoutAccountDto } from '../dto/create-payout-account.dto';
import type { EBeneficiaryStatus } from '../enums/payout-account.enum';

/** Client-safe view of a payout account — masked, no secrets. */
export interface IPayoutAccount {
  id: string;
  bankName: string;
  accountType: string;
  last4: string;
  isPrimary: boolean;
  addedAt: string;
  currency: string;
  /** Cashfree verification state; payouts allowed only when `verified`. */
  beneficiaryStatus: EBeneficiaryStatus;
}

export interface IPayoutAccountService {
  getAccounts(hostId: string): Promise<IPayoutAccount[]>;
  addAccount(
    hostId: string,
    dto: CreatePayoutAccountDto,
  ): Promise<IPayoutAccount>;
  /**
   * Remove a host's payout account. Blocked while a payout to it is in flight;
   * if the removed account was primary, another account is auto-promoted.
   */
  removeAccount(hostId: string, accountId: string): Promise<void>;
  /** Make an owned account the host's primary payout destination. */
  setPrimary(hostId: string, accountId: string): Promise<IPayoutAccount>;
}
