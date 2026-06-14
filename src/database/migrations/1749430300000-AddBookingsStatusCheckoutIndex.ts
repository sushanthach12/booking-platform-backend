import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 (completion pipeline): composite index so the completion sweep's
 * predicate (status = CONFIRMED AND check_out_date <= NOW()) is sargable at
 * scale — today only `status` is indexed and the query would table-scan.
 */
export class AddBookingsStatusCheckoutIndex1749430300000 implements MigrationInterface {
  name = 'AddBookingsStatusCheckoutIndex1749430300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bookings_status_checkOutDate" ON "bookings" ("status", "check_out_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_bookings_status_checkOutDate"`,
    );
  }
}
