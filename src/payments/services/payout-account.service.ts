import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  PAYOUT_ACCOUNT_REPOSITORY,
  PAYOUT_REPOSITORY,
} from '../../database/di/symbols';
import { CreatePayoutAccountDto } from '../dto/create-payout-account.dto';
import { PayoutAccountEntity } from '../entities/payout-account.entity';
import {
  EBeneficiaryStatus,
  EPayoutAccountType,
} from '../enums/payout-account.enum';
import { PayoutGatewayFactory } from '../factories/payout-gateway.factory';
import { PayoutEncryptionHelper } from '../helpers/payout-encryption.helper';
import type { IPayoutAccount } from '../interfaces/payout-account.service.interface';
import type { IPayoutAccountRepository } from '../repositories/interfaces/payout-account.repository.interface';
import type { IPayoutRepository } from '../repositories/interfaces/payout.repository.interface';

const PAYOUT_CURRENCY = 'INR';

@Injectable()
export class PayoutAccountService {
  private readonly logger = new Logger(PayoutAccountService.name);

  constructor(
    @Inject(PAYOUT_ACCOUNT_REPOSITORY)
    private readonly repository: IPayoutAccountRepository,
    @Inject(PAYOUT_REPOSITORY)
    private readonly payoutRepository: IPayoutRepository,
    private readonly encryption: PayoutEncryptionHelper,
    private readonly payoutGatewayFactory: PayoutGatewayFactory,
  ) {}

  async getAccounts(hostId: string): Promise<IPayoutAccount[]> {
    const accounts = await this.repository.findByHost(hostId);
    return accounts.map((a) => this.toMasked(a));
  }

  async addAccount(
    hostId: string,
    dto: CreatePayoutAccountDto,
  ): Promise<IPayoutAccount> {
    const accountType = dto.accountType ?? EPayoutAccountType.BANK;
    const isUpi = accountType === EPayoutAccountType.UPI;

    // Register the beneficiary with Cashfree BEFORE persisting, so we never
    // store an account that can't receive money. Invalid/failed → 422.
    const gateway = this.payoutGatewayFactory.getDefaultGateway();
    const beneficiary = await gateway.registerBeneficiary({
      beneficiaryId: `HOST_${hostId}`,
      name: dto.accountHolder,
      accountType,
      accountNumber: dto.accountNumber,
      ifsc: dto.ifsc?.toUpperCase(),
      upiId: dto.upiId,
    });

    if (
      beneficiary.status === EBeneficiaryStatus.INVALID ||
      beneficiary.status === EBeneficiaryStatus.FAILED
    ) {
      this.logger.warn(
        `Beneficiary for host ${hostId} rejected: ${beneficiary.status}`,
      );
      throw new UnprocessableEntityException(
        'Your payout account could not be verified. Please check the details and try again.',
      );
    }

    const isFirst = (await this.repository.countByHost(hostId)) === 0;

    const created = await this.repository.create({
      hostId,
      accountType,
      accountHolderName: dto.accountHolder,
      bankName: isUpi ? 'UPI' : (dto.bankName ?? ''),
      accountNumberEncrypted:
        !isUpi && dto.accountNumber
          ? this.encryption.encrypt(dto.accountNumber)
          : null,
      ifscEncrypted:
        !isUpi && dto.ifsc
          ? this.encryption.encrypt(dto.ifsc.toUpperCase())
          : null,
      upiIdEncrypted:
        isUpi && dto.upiId ? this.encryption.encrypt(dto.upiId) : null,
      last4: this.deriveLast4(dto, isUpi),
      cashfreeBeneficiaryId: beneficiary.beneficiaryId,
      // A successful (non-invalid/failed) Cashfree registration means the
      // account is usable now — there is no "pending" add state for us. Store
      // it as VERIFIED so the host can immediately request payouts to it.
      beneficiaryStatus: EBeneficiaryStatus.VERIFIED,
      isPrimary: isFirst,
      currency: PAYOUT_CURRENCY,
    });

    return this.toMasked(created);
  }

  /**
   * Remove an owned account. Refuses while a payout to it is pending/processing
   * (the funds could still be redirected). If the removed account was primary
   * and others remain, the newest verified account (or just the newest) is
   * promoted so the host always has a primary destination.
   */
  async removeAccount(hostId: string, accountId: string): Promise<void> {
    const account = await this.repository.findByIdAndHost(accountId, hostId);
    if (!account) {
      throw new NotFoundException('Payout account not found');
    }

    if (await this.payoutRepository.hasInFlightForAccount(accountId)) {
      throw new ConflictException(
        'This account has a payout in progress and cannot be removed yet.',
      );
    }

    await this.repository.delete(accountId);

    if (account.isPrimary) {
      // findByHost orders primary-first then newest-first, so [0] is newest.
      const remaining = await this.repository.findByHost(hostId);
      if (remaining.length) {
        const next =
          remaining.find(
            (a) => a.beneficiaryStatus === EBeneficiaryStatus.VERIFIED,
          ) ?? remaining[0];
        await this.repository.setPrimary(next.id, hostId);
      }
    }

    this.logger.log(`Removed payout account ${accountId} for host ${hostId}`);
  }

  /** Make an owned account the host's single primary payout destination. */
  async setPrimary(hostId: string, accountId: string): Promise<IPayoutAccount> {
    const account = await this.repository.findByIdAndHost(accountId, hostId);
    if (!account) {
      throw new NotFoundException('Payout account not found');
    }

    await this.repository.setPrimary(accountId, hostId);
    this.logger.log(
      `Set payout account ${accountId} as primary for host ${hostId}`,
    );

    return this.toMasked({ ...account, isPrimary: true });
  }

  /** Last 4 of the account number (bank) or the VPA handle (UPI) — display only. */
  private deriveLast4(dto: CreatePayoutAccountDto, isUpi: boolean): string {
    if (isUpi) {
      return (dto.upiId?.split('@')[0] ?? '').slice(-4);
    }
    return (dto.accountNumber ?? '').slice(-4);
  }

  /** Strips all encrypted/secret fields; only client-safe data leaves here. */
  private toMasked(entity: PayoutAccountEntity): IPayoutAccount {
    return {
      id: entity.id,
      bankName: entity.bankName,
      accountType:
        entity.accountType === EPayoutAccountType.UPI ? 'UPI' : 'Bank account',
      last4: entity.last4,
      isPrimary: entity.isPrimary,
      addedAt: entity.createdAt.toISOString(),
      currency: entity.currency,
      beneficiaryStatus: entity.beneficiaryStatus,
    };
  }
}
