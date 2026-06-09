import { MigrationInterface, QueryRunner } from 'typeorm';

/** §2.1 payout_accounts table (sensitive fields stored encrypted). */
export class CreatePayoutAccounts1749427300000 implements MigrationInterface {
  name = 'CreatePayoutAccounts1749427300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payout_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "hostId" uuid NOT NULL,
        "accountHolderName" character varying(120) NOT NULL,
        "bankName" character varying(120) NOT NULL,
        "ifscEncrypted" character varying(255) NOT NULL,
        "accountNumberEncrypted" character varying(255) NOT NULL,
        "last4" character varying(4) NOT NULL,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "currency" character varying(3) NOT NULL DEFAULT 'INR',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_payout_accounts" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payout_accounts_hostId" ON "payout_accounts" ("hostId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payout_accounts_hostId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_accounts"`);
  }
}
