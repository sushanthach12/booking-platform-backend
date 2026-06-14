import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 6 (payout dispatch): add the Cashfree transfer/reconciliation columns
 * to payouts. The `status` column already accepts the new 'processing' value
 * (varchar) — no type change needed.
 */
export class AlterPayoutsAddDispatchFields1749430500000 implements MigrationInterface {
  name = 'AlterPayoutsAddDispatchFields1749430500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "platformFee" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "bookingId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "hostPayoutAccountId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "cashfreeTransferId" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "cashfreeStatus" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "failureReason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "transferUtr" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of [
      'transferUtr',
      'processedAt',
      'failureReason',
      'cashfreeStatus',
      'cashfreeTransferId',
      'hostPayoutAccountId',
      'bookingId',
      'platformFee',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "payouts" DROP COLUMN IF EXISTS "${col}"`,
      );
    }
  }
}
