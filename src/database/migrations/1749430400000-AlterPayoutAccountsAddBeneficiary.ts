import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5 (Cashfree beneficiary): add accountType, UPI support, and Cashfree
 * beneficiary linkage to payout accounts. Bank encrypted columns become
 * nullable so a UPI-only account can omit them. Existing bank rows default to
 * accountType='bank' and beneficiaryStatus='initiated' (not yet registered).
 */
export class AlterPayoutAccountsAddBeneficiary1749430400000 implements MigrationInterface {
  name = 'AlterPayoutAccountsAddBeneficiary1749430400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payout_accounts" ADD COLUMN IF NOT EXISTS "accountType" character varying(10) NOT NULL DEFAULT 'bank'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payout_accounts" ADD COLUMN IF NOT EXISTS "upiIdEncrypted" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payout_accounts" ADD COLUMN IF NOT EXISTS "cashfreeBeneficiaryId" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payout_accounts" ADD COLUMN IF NOT EXISTS "beneficiaryStatus" character varying(20) NOT NULL DEFAULT 'initiated'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payout_accounts" ALTER COLUMN "ifscEncrypted" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payout_accounts" ALTER COLUMN "accountNumberEncrypted" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payout_accounts" DROP COLUMN IF EXISTS "beneficiaryStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payout_accounts" DROP COLUMN IF EXISTS "cashfreeBeneficiaryId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payout_accounts" DROP COLUMN IF EXISTS "upiIdEncrypted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payout_accounts" DROP COLUMN IF EXISTS "accountType"`,
    );
  }
}
