import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * §2.0 payout fixups: default currency INR, add bookingCount/accountLast4,
 * and index hostId/status. Backfills existing USD rows to INR.
 */
export class AlterPayoutsAddFields1749427200000 implements MigrationInterface {
  name = 'AlterPayoutsAddFields1749427200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payouts" ALTER COLUMN "currency" SET DEFAULT 'INR'`,
    );
    await queryRunner.query(
      `UPDATE "payouts" SET "currency" = 'INR' WHERE "currency" = 'USD'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "bookingCount" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "accountLast4" character varying(4)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payouts_hostId" ON "payouts" ("hostId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payouts_status" ON "payouts" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payouts_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payouts_hostId"`);
    await queryRunner.query(
      `ALTER TABLE "payouts" DROP COLUMN IF EXISTS "accountLast4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" DROP COLUMN IF EXISTS "bookingCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ALTER COLUMN "currency" SET DEFAULT 'USD'`,
    );
  }
}
