import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2 (earnings ledger): the immutable double-entry ledger behind each
 * wallet. A partial unique index on (bookingId) WHERE category='BOOKING_EARNING'
 * guarantees exactly one earning credit per booking (idempotent crediting).
 * The (status, releaseAt) index drives the daily release sweep.
 */
export class CreateWalletTransactions1749430200000 implements MigrationInterface {
  name = 'CreateWalletTransactions1749430200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "hostId" uuid NOT NULL,
        "walletId" uuid NOT NULL,
        "type" character varying(10) NOT NULL,
        "category" character varying(20) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "balanceAfter" numeric(14,2) NOT NULL,
        "status" character varying(20) NOT NULL,
        "bookingId" uuid,
        "payoutId" uuid,
        "releaseAt" TIMESTAMP WITH TIME ZONE,
        "description" character varying(255),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_wallet_transactions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_txn_hostId" ON "wallet_transactions" ("hostId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_txn_walletId" ON "wallet_transactions" ("walletId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_txn_status_releaseAt" ON "wallet_transactions" ("status", "releaseAt")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_wallet_txn_booking_earning" ON "wallet_transactions" ("bookingId") WHERE "category" = 'booking_earning'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_wallet_txn_booking_earning"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_wallet_txn_status_releaseAt"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_txn_walletId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_txn_hostId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_transactions"`);
  }
}
