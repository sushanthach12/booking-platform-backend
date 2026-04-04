import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates a PostgreSQL sequence for generating unique booking numbers.
 * Replaces the COUNT-based approach which has a race condition under concurrent bookings.
 * Format: BK{YEAR}{MONTH}-{SEQ} e.g. BK202604-0001
 */
export class CreateBookingNumberSequence1743780000000 public async up(queryRunner:      await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1 INCREMENT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS booking_number_seq`);
  }
}
