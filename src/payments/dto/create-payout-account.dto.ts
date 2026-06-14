import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';
import { EPayoutAccountType } from '../enums/payout-account.enum';

/**
 * Create a payout account. `accountType` defaults to `bank` when omitted.
 * Bank requires `bankName` + `accountNumber` + `ifsc`; UPI requires `upiId`.
 */
export class CreatePayoutAccountDto {
  @ApiPropertyOptional({
    enum: EPayoutAccountType,
    description: 'Destination type. Defaults to bank.',
    default: EPayoutAccountType.BANK,
  })
  @IsOptional()
  @IsEnum(EPayoutAccountType)
  accountType?: EPayoutAccountType;

  @ApiProperty({
    description: 'Account holder name exactly as on the account',
    example: 'Aarav Sharma',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @Length(2, 120)
  accountHolder: string;

  @ApiPropertyOptional({
    description: 'Bank name (required for bank accounts)',
    example: 'HDFC Bank',
  })
  @ValidateIf(
    (o: CreatePayoutAccountDto) => o.accountType !== EPayoutAccountType.UPI,
  )
  @IsString()
  @Length(2, 120)
  bankName?: string;

  @ApiPropertyOptional({
    description: 'Indian bank account number, 9–18 digits (required for bank)',
    example: '012345678901',
  })
  @ValidateIf(
    (o: CreatePayoutAccountDto) => o.accountType !== EPayoutAccountType.UPI,
  )
  @IsString()
  @Matches(/^\d{9,18}$/, { message: 'accountNumber must be 9 to 18 digits' })
  accountNumber?: string;

  @ApiPropertyOptional({
    description: '11-character IFSC code (required for bank)',
    example: 'HDFC0001234',
  })
  @ValidateIf(
    (o: CreatePayoutAccountDto) => o.accountType !== EPayoutAccountType.UPI,
  )
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'ifsc must be a valid 11-character IFSC code',
  })
  ifsc?: string;

  @ApiPropertyOptional({
    description: 'UPI VPA (required for UPI accounts)',
    example: 'aarav@okhdfcbank',
  })
  @ValidateIf(
    (o: CreatePayoutAccountDto) => o.accountType === EPayoutAccountType.UPI,
  )
  @IsString()
  @Matches(/^[\w.-]{2,256}@[a-zA-Z]{2,64}$/, {
    message: 'upiId must be a valid UPI VPA',
  })
  upiId?: string;
}
