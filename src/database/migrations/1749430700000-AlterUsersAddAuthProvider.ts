import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Google login: track the registration/login source on users and support
 * passwordless (Google) accounts.
 *  - auth_provider: 'email' (default, existing rows) or 'google'
 *  - google_id: Google subject id, unique, nullable
 *  - password becomes nullable (Google users have none)
 */
export class AlterUsersAddAuthProvider1749430700000 implements MigrationInterface {
  name = 'AlterUsersAddAuthProvider1749430700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" character varying(20) NOT NULL DEFAULT 'email'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" character varying(255)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_google_id" ON "users" ("google_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_google_id"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "google_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "auth_provider"`,
    );
  }
}
