import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `booking_number_seq` Postgres sequence used by
 * BookingService to generate human-readable booking numbers
 * (BKYYYYMM-NNNN) via `nextval('booking_number_seq')`. The code
 * referenced this sequence but no migration ever created it, causing
 * booking creation to fail with: relation "booking_number_seq" does not exist.
 */
export class CreateBookingNumberSequence1749430800000 implements MigrationInterface {
  name = 'CreateBookingNumberSequence1749430800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "booking_number_seq" START WITH 1 INCREMENT BY 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "booking_number_seq"`);
  }
}
