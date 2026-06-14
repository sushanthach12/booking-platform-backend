import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 (revenue model): persist the platform/host split on each booking.
 * `platform_fee` is the host-side commission captured at booking time
 * (GST-inclusive, defaults to 0); `host_net` is `grand_total − platform_fee`.
 * Backfills existing rows so `host_net` mirrors `grand_total` (0 commission).
 */
export class AlterBookingsAddCommissionFields1749430000000 implements MigrationInterface {
  name = 'AlterBookingsAddCommissionFields1749430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "platform_fee" numeric(10,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "host_net" numeric(10,2)`,
    );
    // Backfill historical bookings: with 0 commission, host_net == grand_total.
    await queryRunner.query(
      `UPDATE "bookings" SET "host_net" = "grand_total" WHERE "host_net" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "host_net"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN IF EXISTS "platform_fee"`,
    );
  }
}
