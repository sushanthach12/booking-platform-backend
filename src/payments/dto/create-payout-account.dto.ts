import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class CreatePayoutAccountDto {
  @ApiProperty({
    description: 'Account holder name exactly as on the bank account',
    example: 'Aarav Sharma',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @Length(2, 120)
  accountHolder: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'HDFC Bank',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @Length(2, 120)
  bankName: string;

  @ApiProperty({
    description: 'Indian bank account number (9–18 digits)',
    example: '012345678901',
  })
  @IsString()
  @Matches(/^\d{9,18}$/, {
    message: 'accountNumber must be 9 to 18 digits',
  })
  accountNumber: string;

  @ApiProperty({
    description: '11-character IFSC code',
    example: 'HDFC0001234',
  })
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'ifsc must be a valid 11-character IFSC code',
  })
  ifsc: string;
}
