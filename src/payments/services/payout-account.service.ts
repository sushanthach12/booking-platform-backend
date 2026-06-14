import {
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PAYOUT_ACCOUNT_REPOSITORY } from '../../database/di/symbols';
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

const PAYOUT_CURRENCY = 'INR';

@Injectable()
export class PayoutAccountService {
  private readonly logger = new Logger(PayoutAccountService.name);

  constructor(
    @Inject(PAYOUT_ACCOUNT_REPOSITORY)
    private readonly repository: IPayoutAccountRepository,
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
      beneficiaryStatus: beneficiary.status,
      isPrimary: isFirst,
      currency: PAYOUT_CURRENCY,
    });

    return this.toMasked(created);
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
