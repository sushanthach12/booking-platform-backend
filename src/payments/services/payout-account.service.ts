import { Inject, Injectable } from '@nestjs/common';
import { PAYOUT_ACCOUNT_REPOSITORY } from '../../database/di/symbols';
import { CreatePayoutAccountDto } from '../dto/create-payout-account.dto';
import { PayoutAccountEntity } from '../entities/payout-account.entity';
import { PayoutEncryptionHelper } from '../helpers/payout-encryption.helper';
import type { IPayoutAccount } from '../interfaces/payout-account.service.interface';
import type { IPayoutAccountRepository } from '../repositories/interfaces/payout-account.repository.interface';

const PAYOUT_ACCOUNT_TYPE = 'Savings account';
const PAYOUT_CURRENCY = 'INR';

@Injectable()
export class PayoutAccountService {
  constructor(
    @Inject(PAYOUT_ACCOUNT_REPOSITORY)
    private readonly repository: IPayoutAccountRepository,
    private readonly encryption: PayoutEncryptionHelper,
  ) {}

  async getAccounts(hostId: string): Promise<IPayoutAccount[]> {
    const accounts = await this.repository.findByHost(hostId);
    return accounts.map((a) => this.toMasked(a));
  }

  async addAccount(
    hostId: string,
    dto: CreatePayoutAccountDto,
  ): Promise<IPayoutAccount> {
    const last4 = dto.accountNumber.slice(-4);
    const isFirst = (await this.repository.countByHost(hostId)) === 0;

    const created = await this.repository.create({
      hostId,
      accountHolderName: dto.accountHolder,
      bankName: dto.bankName,
      accountNumberEncrypted: this.encryption.encrypt(dto.accountNumber),
      ifscEncrypted: this.encryption.encrypt(dto.ifsc.toUpperCase()),
      last4,
      isPrimary: isFirst,
      currency: PAYOUT_CURRENCY,
    });

    return this.toMasked(created);
  }

  /** Strips all encrypted/secret fields; only client-safe data leaves here. */
  private toMasked(entity: PayoutAccountEntity): IPayoutAccount {
    return {
      id: entity.id,
      bankName: entity.bankName,
      accountType: PAYOUT_ACCOUNT_TYPE,
      last4: entity.last4,
      isPrimary: entity.isPrimary,
      addedAt: entity.createdAt.toISOString(),
      currency: entity.currency,
    };
  }
}
