import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 9 (cancellation refund): audit columns for the policy-driven refund —
 * how much was refunded to the guest, how much was retained as a cancellation
 * fee, and the refund percentage applied.
 */
export class AlterBookingsAddCancellationFields1749430600000 implements MigrationInterface {
  name = 'AlterBookingsAddCancellationFields1749430600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refund_amount" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancellation_fee" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refund_percentage" numeric(5,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "refund_percentage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "cancellation_fee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "refund_amount"`,
    );
  }
}
