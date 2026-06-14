import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2 (earnings ledger): host wallet — a cached aggregate balance over the
 * wallet_transactions ledger. One row per host (unique hostId). Balances are
 * UTC-timestamped (timestamptz) and mutated under a pessimistic row lock.
 */
export class CreateWallets1749430100000 implements MigrationInterface {
  name = 'CreateWallets1749430100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "hostId" uuid NOT NULL,
        "availableBalance" numeric(14,2) NOT NULL DEFAULT 0,
        "pendingBalance" numeric(14,2) NOT NULL DEFAULT 0,
        "reserveBalance" numeric(14,2) NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL DEFAULT 'INR',
        "version" integer NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_wallets" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_wallets_hostId" ON "wallets" ("hostId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_wallets_hostId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets"`);
  }
}
