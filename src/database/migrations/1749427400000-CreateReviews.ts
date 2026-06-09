import { MigrationInterface, QueryRunner } from 'typeorm';

/** §3.1 reviews table — one review per booking. */
export class CreateReviews1749427400000 implements MigrationInterface {
  name = 'CreateReviews1749427400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "bookingId" uuid NOT NULL,
        "propertyId" uuid NOT NULL,
        "guestId" uuid NOT NULL,
        "hostId" uuid NOT NULL,
        "rating" integer NOT NULL,
        "comment" text NOT NULL,
        "responseText" text,
        "respondedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reviews_bookingId" UNIQUE ("bookingId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reviews_hostId" ON "reviews" ("hostId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reviews_propertyId" ON "reviews" ("propertyId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reviews_propertyId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reviews_hostId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
  }
}
